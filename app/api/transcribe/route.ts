import OpenAI from 'openai';
import { headers } from 'next/headers';
import { auth } from '@/app/lib/auth';
import { getInventoryOptionsForUser } from '@/app/lib/inventory-options';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function todayZurichDDMMYYYY(): string {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function isValidGermanDate(str: any): str is string {
  return typeof str === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(str);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'de',
      response_format: 'json',
    });

    const text = (transcription as any).text?.trim?.() ?? '';

    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const { units: allowedUnits, categories: allowedCats, defaultUnit, defaultCategory } =
      await getInventoryOptionsForUser(session?.user?.id);
    const todayStr = todayZurichDDMMYYYY();
    const defaultUnitJson = JSON.stringify(defaultUnit);
    const defaultCategoryJson = JSON.stringify(defaultCategory);

    const resp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Du extrahierst strukturierte Daten aus deutschem Text. Antworte nur als reines JSON ohne Markdown oder Zusatztext.',
        },
        {
          role: 'user',
          content:
            `Text: "${text}"\n\n` +
            `HEUTIGES DATUM (Europe/Zurich): ${todayStr}\n\n` +
            `WICHTIG ZUM DATUM:\n` +
            `- Wenn im Text ein relatives Ablaufdatum vorkommt (z.B. "in zwei Wochen", "morgen", "uebermorgen", "in 3 Tagen", "naechsten Freitag"), rechne es immer in ein konkretes Datum um.\n` +
            `- Gib ablaufdatum immer als festes Datum im Format "DD.MM.YYYY" zurueck.\n` +
            `- Wenn kein Ablaufdatum erwaehnt ist: null.\n\n` +
            `EINHEIT muss exakt aus dieser Liste sein, sonst ${defaultUnitJson}:\n` +
            `${JSON.stringify(allowedUnits)}\n\n` +
            `KATEGORIE muss exakt aus dieser Liste sein, sonst ${defaultCategoryJson}:\n` +
            `${JSON.stringify(allowedCats)}\n\n` +
            `Gib nur dieses JSON-Format zurueck:\n` +
            `{"name":"", "menge": 1, "einheit":${defaultUnitJson}, "kategorie":${defaultCategoryJson}, "ablaufdatum":"DD.MM.YYYY"|null}\n\n` +
            `Regeln:\n` +
            `- name: Produktname kurz\n` +
            `- menge: Zahl, Default 1\n` +
            `- einheit: exakt aus Liste, sonst ${defaultUnitJson}\n` +
            `- kategorie: exakt aus Liste, sonst ${defaultCategoryJson}\n`,
        },
      ],
    });

    const raw = resp.output_text?.trim?.() ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        name: '',
        menge: 1,
        einheit: defaultUnit,
        kategorie: defaultCategory,
        ablaufdatum: null,
      };
    }

    if (!allowedUnits.includes(parsed.einheit)) {
      parsed.einheit = defaultUnit;
    }
    if (!allowedCats.includes(parsed.kategorie)) {
      parsed.kategorie = defaultCategory;
    }
    if (parsed.ablaufdatum != null && !isValidGermanDate(parsed.ablaufdatum)) {
      parsed.ablaufdatum = null;
    }

    return Response.json({ text, parsed });
  } catch (err: any) {
    if (err?.status === 429) {
      return Response.json(
        { error: 'OpenAI Kontingent/Quota ueberschritten. Bitte Billing/Usage pruefen.' },
        { status: 429 }
      );
    }
    return Response.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
