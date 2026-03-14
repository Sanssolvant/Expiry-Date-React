import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/app/lib/auth';
import { getInventoryOptionsForUser } from '@/app/lib/inventory-options';

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildImageAnalysisPrompt(
  categories: string[],
  units: string[],
  defaultCategory: string,
  defaultUnit: string
) {
  const defaultCategoryJson = JSON.stringify(defaultCategory);
  const defaultUnitJson = JSON.stringify(defaultUnit);

  return `
Du analysierst ein Foto einer Produktsammlung (Vorrat oder Kuehlschrank).

Ziel:
- Erkenne sichtbare Produkte (keine Marken erfinden).
- Zähle Einzelexemplare.
- Ordne jedes Produkt genau einer Kategorie aus der Liste zu.
- Schätze ein Ablaufdatum nur wenn sinnvoll.
- Gib confidence (0-1) an.

ERLAUBTE KATEGORIEN (nur diese):
${categories.join(', ')}

ERLAUBTE EINHEITEN (nur diese):
${units.join(', ')}

Wenn unklar:
- category = ${defaultCategoryJson}
- unit = ${defaultUnitJson}

Zählregeln:
- Bei einzelnen Exemplaren (z.B. Tomaten am Strauch): jedes Exemplar einzeln zählen.
- Gib für jedes sichtbare Exemplar eine Instanz in instances aus.
- Koordinaten in instances sind normalisiert auf 0..1000: x,y,w,h.
- c ist die Instanz-Confidence 0..1.
- quantity soll der Anzahl sichtbarer Exemplare entsprechen.
- quantity_min = sicher sichtbar
- quantity_max = plausibel sichtbar
- quantity_best = bestes Urteil

Qualitätsregeln:
- Nicht raten wenn unklar.
- Lieber weniger Items als falsche.
- Keine unsichtbaren Produkte erfinden.

Ablaufdatum:
- Format DD.MM.YYYY oder null.
- Nur schätzen wenn Produkttyp klar erkennbar.

Output:
- Gib ausschliesslich valides JSON im Schema zurueck.
- notes immer als string (wenn nichts: "").
`;
}

function sanitizeChoice(raw: unknown, allowed: string[], fallback: string): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value || !allowed.includes(value)) {
    return fallback;
  }
  return value;
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

    const { categories, units, defaultCategory, defaultUnit } = await getInventoryOptionsForUser(
      session.user.id
    );

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mime = image.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              quantity: { type: 'integer' },
              quantity_min: { type: 'integer' },
              quantity_max: { type: 'integer' },
              quantity_best: { type: 'integer' },
              unit: { type: 'string', enum: units },
              category: { type: 'string', enum: categories },
              expiry_guess: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              confidence: { type: 'number' },
              instances: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    x: { type: 'integer' },
                    y: { type: 'integer' },
                    w: { type: 'integer' },
                    h: { type: 'integer' },
                    c: { type: 'number' },
                  },
                  required: ['x', 'y', 'w', 'h', 'c'],
                },
              },
            },
            required: [
              'name',
              'quantity',
              'quantity_min',
              'quantity_max',
              'quantity_best',
              'unit',
              'category',
              'expiry_guess',
              'confidence',
              'instances',
            ],
          },
        },
        notes: { type: 'string' },
      },
      required: ['items', 'notes'],
    };

    const response = await client.responses.create({
      model: 'gpt-5.2',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildImageAnalysisPrompt(categories, units, defaultCategory, defaultUnit),
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
          name: 'product_collection_parse',
          strict: true,
          schema,
        },
      },
    });

    const raw = response.output_text ?? '{}';
    const parsed = JSON.parse(raw);

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalizedItems = items
      .map((it: any) => {
        const instances = Array.isArray(it?.instances) ? it.instances : [];
        const qFromInstances = instances.length > 0 ? instances.length : null;

        const quantityBest = Number.isFinite(it?.quantity_best) ? Number(it.quantity_best) : null;
        const quantity = Number.isFinite(it?.quantity) ? Number(it.quantity) : 1;

        const finalQuantity = qFromInstances ?? quantityBest ?? quantity;

        const qMin = Number.isFinite(it?.quantity_min) ? Number(it.quantity_min) : finalQuantity;
        const qMax = Number.isFinite(it?.quantity_max) ? Number(it.quantity_max) : finalQuantity;
        const qBest = quantityBest ?? finalQuantity;

        return {
          name: String(it?.name ?? '').trim(),
          quantity: Math.max(1, Math.round(finalQuantity)),
          quantity_min: Math.max(1, Math.round(qMin)),
          quantity_max: Math.max(1, Math.round(qMax)),
          quantity_best: Math.max(1, Math.round(qBest)),
          unit: sanitizeChoice(it?.unit, units, defaultUnit),
          category: sanitizeChoice(it?.category, categories, defaultCategory),
          expiry_guess: it?.expiry_guess ?? null,
          confidence: typeof it?.confidence === 'number' ? it.confidence : 0.5,
          instances,
        };
      })
      .filter((it: any) => it.name.length > 0);

    return NextResponse.json({
      items: normalizedItems,
      notes: typeof parsed?.notes === 'string' ? parsed.notes : '',
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
