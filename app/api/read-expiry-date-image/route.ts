import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/app/lib/auth';

dayjs.extend(customParseFormat);

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTPUT_DATE_FORMAT = 'DD.MM.YYYY';

function normalizeExpiryDate(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    return null;
  }

  const formats = [
    'DD.MM.YYYY',
    'D.M.YYYY',
    'DD/MM/YYYY',
    'D/M/YYYY',
    'DD-MM-YYYY',
    'D-M-YYYY',
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'YYYY.MM.DD',
    'MM.YYYY',
    'M.YYYY',
    'M-YYYY',
    'MM/YYYY',
    'M/YYYY',
  ];

  for (const format of formats) {
    const parsed = dayjs(value, format, true);
    if (parsed.isValid()) {
      return parsed.format(OUTPUT_DATE_FORMAT);
    }
  }

  return null;
}

function buildPrompt() {
  return `
Du liest ein MHD/Ablaufdatum von einem einzelnen Foto.

Regeln:
- Gib nur ein Datum zurück, wenn es im Bild klar erkennbar ist.
- Keine Schätzung, kein Raten.
- Wenn kein klares Datum erkennbar ist: null.
- Wenn mehrere Datumswerte sichtbar sind, nutze das Datum, das am ehesten das MHD/EXP/BBD ist.
- Gib das Datum als DD.MM.YYYY zurück.
- Wenn ein Datum monat und Jahr (MM.YYYY) ist, setze den Tag auf 01 (erster Tag des Monats).

Output:
- Gib ausschliesslich valides JSON im Schema zurück.
`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Kein Bild im Feld 'image' gefunden" }, { status: 400 });
    }

    if (!image.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien sind erlaubt.' }, { status: 400 });
    }

    const maxImageBytes = 10 * 1024 * 1024;
    if (image.size > maxImageBytes) {
      return NextResponse.json({ error: 'Bild ist zu gross (max. 10 MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mime = image.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        expiry_date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        confidence: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['expiry_date', 'confidence', 'notes'],
    };

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(),
            },
            {
              type: 'input_image',
              image_url: dataUrl,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'expiry_date_from_image',
          strict: true,
          schema,
        },
      },
    });

    const raw = response.output_text ?? '{}';
    const parsed = JSON.parse(raw);
    const expiryDate = normalizeExpiryDate(parsed?.expiry_date);

    return NextResponse.json({
      expiry_date: expiryDate,
      confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0,
      notes: typeof parsed?.notes === 'string' ? parsed.notes : '',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
