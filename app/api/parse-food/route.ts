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

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return Response.json({ error: 'No text provided' }, { status: 400 });
    }

    if (text.length > 2000) {
      return Response.json({ error: 'Text ist zu lang (max. 2000 Zeichen).' }, { status: 400 });
    }

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
            `MEHRERE PRODUKTE:\n` +
            `- Falls mehrere Produkte erwähnt sind, gib alle als eigene Einträge in "items" zurück.\n` +
            `- Auch bei nur einem Produkt muss "items" ein Array mit einem Eintrag sein.\n\n` +
            `EINHEIT exakt aus:\n${JSON.stringify(allowedUnits)}\n\n` +
            `KATEGORIE exakt aus:\n${JSON.stringify(allowedCats)}\n\n` +
            `JSON-Format:\n` +
            `{"items":[{"name":"", "menge": 1, "einheit":${defaultUnitJson}, "kategorie":${defaultCategoryJson}, "ablaufdatum":"DD.MM.YYYY"|null}]}\n\n` +
            `Defaults:\n` +
            `- menge=1\n` +
            `- einheit=${defaultUnitJson} wenn unklar\n` +
            `- kategorie=${defaultCategoryJson} wenn unklar\n`,
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

    return Response.json({ parsed, items });
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
