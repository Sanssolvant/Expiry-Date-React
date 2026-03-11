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
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'No text provided' }, { status: 400 });
    }

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
            'Du extrahierst strukturierte Daten aus deutschem Text. Antworte NUR als reines JSON ohne Markdown oder Zusatztext.',
        },
        {
          role: 'user',
          content:
            `Text: "${text}"\n\n` +
            `HEUTIGES DATUM (Europe/Zurich): ${todayStr}\n\n` +
            `DATUM-REGELN:\n` +
            `- Relative Angaben (z.B. "in zwei Wochen", "morgen", "übermorgen", "nächsten Freitag") immer in fixes Datum umrechnen.\n` +
            `- ablaufdatum IMMER "DD.MM.YYYY" oder null.\n\n` +
            `EINHEIT exakt aus:\n${JSON.stringify(allowedUnits)}\n\n` +
            `KATEGORIE exakt aus:\n${JSON.stringify(allowedCats)}\n\n` +
            `JSON-Format:\n` +
            `{"name":"", "menge": 1, "einheit":${defaultUnitJson}, "kategorie":${defaultCategoryJson}, "ablaufdatum":"DD.MM.YYYY"|null}\n\n` +
            `Defaults:\n` +
            `- menge=1\n` +
            `- einheit=${defaultUnitJson} wenn unklar\n` +
            `- kategorie=${defaultCategoryJson} wenn unklar\n`,
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

    return Response.json({ parsed });
  } catch (err: any) {
    if (err?.status === 429) {
      return Response.json(
        { error: 'OpenAI Kontingent/Quota überschritten. Bitte Billing/Usage prüfen.' },
        { status: 429 }
      );
    }
    return Response.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
