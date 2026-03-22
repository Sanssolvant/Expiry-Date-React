import OpenAI from 'openai';
import { headers } from 'next/headers';
import { auth } from '@/app/lib/auth';
import { getInventoryOptionsForUser } from '@/app/lib/inventory-options';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type ParsedItem = {
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
  ablaufdatum: string | null;
};

function todayZurichDDMMYYYY(): string {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function isValidGermanDate(str: unknown): str is string {
  return typeof str === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(str);
}

function normalizeParsedItems(
  raw: unknown,
  allowedUnits: string[],
  allowedCats: string[],
  defaultUnit: string,
  defaultCategory: string
): ParsedItem[] {
  const sourceItems = Array.isArray((raw as any)?.items) ? (raw as any).items : [raw];

  const normalized = sourceItems
    .map((item: any): ParsedItem | null => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name) {
        return null;
      }

      const rawAmount = Number(item?.menge);
      const menge = Number.isFinite(rawAmount) && rawAmount >= 1 ? Math.round(rawAmount) : 1;
      const einheit =
        typeof item?.einheit === 'string' && allowedUnits.includes(item.einheit) ? item.einheit : defaultUnit;
      const kategorie =
        typeof item?.kategorie === 'string' && allowedCats.includes(item.kategorie)
          ? item.kategorie
          : defaultCategory;
      const ablaufdatum = isValidGermanDate(item?.ablaufdatum) ? item.ablaufdatum : null;

      return { name, menge, einheit, kategorie, ablaufdatum };
    })
    .filter((item: ParsedItem | null): item is ParsedItem => Boolean(item));

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      name: '',
      menge: 1,
      einheit: defaultUnit,
      kategorie: defaultCategory,
      ablaufdatum: null,
    },
  ];
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return Response.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    if (!file.type?.startsWith('audio/')) {
      return Response.json({ error: 'Nur Audiodateien sind erlaubt.' }, { status: 400 });
    }

    const maxAudioBytes = 8 * 1024 * 1024;
    if (file.size > maxAudioBytes) {
      return Response.json({ error: 'Audio ist zu gross (max. 8 MB).' }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'de',
      response_format: 'json',
    });

    const text = (transcription as any).text?.trim?.() ?? '';

    const { units: allowedUnits, categories: allowedCats, defaultUnit, defaultCategory } =
      await getInventoryOptionsForUser(session.user.id);
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
            `- Wenn im Text ein relatives Ablaufdatum vorkommt (z.B. "in zwei Wochen", "morgen", "übermorgen", "in 3 Tagen", "nächsten Freitag"), rechne es immer in ein konkretes Datum um.\n` +
            `- Gib ablaufdatum immer als festes Datum im Format "DD.MM.YYYY" zurück.\n` +
            `- Wenn kein Ablaufdatum erwähnt ist: null.\n\n` +
            `MEHRERE PRODUKTE:\n` +
            `- Falls mehrere Produkte erwähnt sind, gib alle als eigene Einträge in "items" zurück.\n` +
            `- Auch bei nur einem Produkt muss "items" ein Array mit einem Eintrag sein.\n\n` +
            `EINHEIT muss exakt aus dieser Liste sein, sonst ${defaultUnitJson}:\n` +
            `${JSON.stringify(allowedUnits)}\n\n` +
            `KATEGORIE muss exakt aus dieser Liste sein, sonst ${defaultCategoryJson}:\n` +
            `${JSON.stringify(allowedCats)}\n\n` +
            `Gib nur dieses JSON-Format zurück:\n` +
            `{"items":[{"name":"", "menge": 1, "einheit":${defaultUnitJson}, "kategorie":${defaultCategoryJson}, "ablaufdatum":"DD.MM.YYYY"|null}]}\n\n` +
            `Regeln:\n` +
            `- name: Produktname kurz\n` +
            `- menge: Zahl, Default 1\n` +
            `- einheit: exakt aus Liste, sonst ${defaultUnitJson}\n` +
            `- kategorie: exakt aus Liste, sonst ${defaultCategoryJson}\n`,
        },
      ],
    });

    const raw = resp.output_text?.trim?.() ?? '{}';

    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      parsedRaw = { items: [] };
    }

    const items = normalizeParsedItems(parsedRaw, allowedUnits, allowedCats, defaultUnit, defaultCategory);
    const parsed = items[0];

    return Response.json({ text, parsed, items });
  } catch (err: any) {
    if (err?.status === 429) {
      return Response.json(
        { error: 'OpenAI Kontingent/Quota überschritten. Bitte Billing/Usage prüfen.' },
        { status: 429 }
      );
    }
    return Response.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
