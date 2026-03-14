import OpenAI from 'openai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export const runtime = 'nodejs';

type ProductInput = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  kategorie: string;
};

type MacroEstimate = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type AiNutritionItem = {
  productId: string;
  estimable: boolean;
  matchedFood: string;
  estimatedGrams: number | null;
  confidence: number;
  reason: string;
  macros: MacroEstimate;
};

type NutritionResponsePayload = {
  items: Array<
    ProductInput & {
      estimable: boolean;
      matchedFood: string;
      estimatedGrams: number | null;
      confidence: number;
      reason: string;
      macros: MacroEstimate;
    }
  >;
  totals: MacroEstimate;
  coverage: number;
  estimatedCount: number;
  unmatchedCount: number;
};

const MAX_PRODUCTS_PER_REQUEST = 120;
const REQUEST_CACHE_TTL_MS = 2 * 60 * 1000;
const nutritionRequestCache = new Map<string, { expiresAt: number; payload: NutritionResponsePayload }>();

const nutritionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          productId: { type: 'string' },
          estimable: { type: 'boolean' },
          matchedFood: { type: 'string' },
          estimatedGrams: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          confidence: { type: 'number' },
          reason: { type: 'string' },
          macros: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kcal: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
            },
            required: ['kcal', 'protein', 'carbs', 'fat'],
          },
        },
        required: [
          'productId',
          'estimable',
          'matchedFood',
          'estimatedGrams',
          'confidence',
          'reason',
          'macros',
        ],
      },
    },
  },
  required: ['items'],
} as const;

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function nonNegative(value: unknown) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber < 0) {
    return 0;
  }
  return roundOne(asNumber);
}

function normalizeAiItem(raw: any): AiNutritionItem | null {
  const productId = typeof raw?.productId === 'string' ? raw.productId.trim() : '';
  if (!productId) {
    return null;
  }

  const estimable = Boolean(raw?.estimable);
  const matchedFood = typeof raw?.matchedFood === 'string' ? raw.matchedFood.trim() : '';
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim() : '';
  const estimatedGramsRaw = raw?.estimatedGrams;
  const estimatedGrams =
    estimatedGramsRaw == null
      ? null
      : Number.isFinite(Number(estimatedGramsRaw)) && Number(estimatedGramsRaw) > 0
        ? roundOne(Number(estimatedGramsRaw))
        : null;
  const confidenceRaw = Number(raw?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, roundOne(confidenceRaw)))
    : 0;

  const macrosRaw = raw?.macros ?? {};
  const macros: MacroEstimate = {
    kcal: nonNegative(macrosRaw.kcal),
    protein: nonNegative(macrosRaw.protein),
    carbs: nonNegative(macrosRaw.carbs),
    fat: nonNegative(macrosRaw.fat),
  };

  if (!estimable) {
    return {
      productId,
      estimable: false,
      matchedFood,
      estimatedGrams: null,
      confidence,
      reason,
      macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  return {
    productId,
    estimable: true,
    matchedFood,
    estimatedGrams,
    confidence,
    reason,
    macros,
  };
}

function sumMacros(items: MacroEstimate[]) {
  return items.reduce(
    (acc, item) => ({
      kcal: roundOne(acc.kcal + item.kcal),
      protein: roundOne(acc.protein + item.protein),
      carbs: roundOne(acc.carbs + item.carbs),
      fat: roundOne(acc.fat + item.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function emptyPayload(): NutritionResponsePayload {
  return {
    items: [],
    totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    coverage: 0,
    estimatedCount: 0,
    unmatchedCount: 0,
  };
}

function pruneCache() {
  const now = Date.now();
  nutritionRequestCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      nutritionRequestCache.delete(key);
    }
  });
  while (nutritionRequestCache.size > 150) {
    const oldestKey = nutritionRequestCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    nutritionRequestCache.delete(oldestKey);
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category')?.trim() || '';
    const requestedIds = Array.from(
      new Set(
        url.searchParams
          .getAll('productId')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    );

    const where: any = { userId: session.user.id };
    if (category) {
      where.kategorie = category;
    }
    if (requestedIds.length > 0) {
      where.id = { in: requestedIds };
    }

    const orderBy: any = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
    const produkte = await prisma.produkt.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        menge: true,
        einheit: true,
        kategorie: true,
      },
    });

    const products: ProductInput[] = produkte.map((prod) => ({
      id: String(prod.id),
      name: String(prod.name ?? '').trim(),
      menge: Number(prod.menge ?? 0),
      einheit: String(prod.einheit ?? 'Stk'),
      kategorie: String(prod.kategorie ?? '').trim(),
    }));

    if (products.length === 0) {
      return NextResponse.json(emptyPayload());
    }

    const scopedProducts = products.slice(0, MAX_PRODUCTS_PER_REQUEST);
    const inventoryPayload = scopedProducts.map((item) => ({
      productId: item.id,
      name: item.name,
      menge: item.menge,
      einheit: item.einheit,
      kategorie: item.kategorie,
    }));

    pruneCache();
    const cacheKey = `${session.user.id}|${JSON.stringify(inventoryPayload)}`;
    const cached = nutritionRequestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_output_tokens: 10000,
      input: [
        {
          role: 'system',
          content:
            'Du bist ein präziser Ernährungsassistent. Liefere nur valides JSON gemäss Schema.',
        },
        {
          role: 'user',
          content:
            'Schätze für jeden Bestandseintrag ungefähre Makros und Kalorien basierend auf Name, Menge und Einheit.\n\n' +
            'Pflichtregeln:\n' +
            '- Nutze productId exakt aus der Eingabe.\n' +
            '- Gib für jedes Eingabeprodukt genau einen Eintrag zurück.\n' +
            '- confidence zwischen 0 und 1.\n' +
            '- estimatedGrams = geschätzte essbare Gesamtmenge in Gramm (oder null wenn wirklich unklar).\n' +
            '- Nur wenn keine sinnvolle Ableitung moeglich ist: estimable=false und Makros 0.\n\n' +
            'Erkennungsregeln:\n' +
            '- Entferne Marken-/Zusatzwoerter und mappe auf ein Grundlebensmittel.\n' +
            '- Nutze Singular/Plural und Sprachvarianten robust (de/en).\n' +
            '- Einfache Standardprodukte sollen meist erkannt werden.\n\n' +
            'Einheiten und Mengen:\n' +
            '- g direkt nutzen, kg = 1000 g.\n' +
            '- ml/l in Gramm über plausible Dichte umrechnen (wenn unklar etwa 1 g/ml).\n' +
            '- Stk/Packung mit typischen Standardgewichten abschätzen.\n\n' +
            `Eingabeprodukte:\n${JSON.stringify(inventoryPayload)}`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'nutrition_estimates',
          strict: true,
          schema: nutritionSchema,
        },
      },
    });

    const rawText = response.output_text?.trim?.() ?? '{"items":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { items: [] };
    }

    const normalizedAiItems = Array.isArray(parsed?.items)
      ? parsed.items.map((item: any) => normalizeAiItem(item)).filter(Boolean)
      : [];

    const aiMap = new Map<string, AiNutritionItem>();
    for (const item of normalizedAiItems) {
      aiMap.set(item!.productId, item as AiNutritionItem);
    }

    const items = scopedProducts.map((product) => {
      const ai = aiMap.get(product.id);
      if (!ai) {
        return {
          ...product,
          estimable: false,
          matchedFood: '',
          estimatedGrams: null as number | null,
          confidence: 0,
          reason: 'Keine KI-Schätzung verfügbar',
          macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        };
      }

      return {
        ...product,
        estimable: ai.estimable,
        matchedFood: ai.matchedFood,
        estimatedGrams: ai.estimatedGrams,
        confidence: ai.confidence,
        reason: ai.reason,
        macros: ai.macros,
      };
    });

    const estimatedItems = items.filter((item) => item.estimable);
    const totals = sumMacros(estimatedItems.map((item) => item.macros));
    const estimatedCount = estimatedItems.length;
    const unmatchedCount = items.length - estimatedCount;
    const coverage = Math.round((estimatedCount / items.length) * 100);

    const payload: NutritionResponsePayload = {
      items,
      totals,
      coverage,
      estimatedCount,
      unmatchedCount,
    };

    nutritionRequestCache.set(cacheKey, {
      expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    if (error?.status === 429) {
      return NextResponse.json({ error: 'OpenAI Kontingent/Quota überschritten.' }, { status: 429 });
    }

    console.error('Fehler bei Nährwert-Schätzung:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler bei Nährwert-Schätzung' }, { status: 500 });
  }
}
