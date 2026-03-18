import OpenAI from 'openai';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';

export const runtime = 'nodejs';

type InventoryInput = {
  name: string;
  menge?: number;
  einheit?: string;
};

type RecipeIngredient = {
  name: string;
  amount: string;
  optional?: boolean;
};

type RecipeStep = {
  title: string;
  detail: string;
  ingredientAmounts: string[];
};

type RecipeCandidate = {
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  dishType: 'sweet' | 'savory';
  sourceTitle: string;
  sourceUrl: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

type EnrichedRecipe = RecipeCandidate & {
  availableIngredients: RecipeIngredient[];
  missingIngredients: RecipeIngredient[];
  missingCount: number;
};

type SuggestResponsePayload = {
  perfectRecipes: EnrichedRecipe[];
  almostRecipes: EnrichedRecipe[];
  webSearchUsed: boolean;
  webSourceCount: number;
};

const MAX_INVENTORY_ITEMS = 60;
const TARGET_RECIPE_COUNT = 3;
const REQUEST_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 150;
const recipeSuggestCache = new Map<string, { expiresAt: number; payload: SuggestResponsePayload }>();

const preferredRecipeDomains = [
  'chefkoch.de',
  'essen-und-trinken.de',
  'springlane.de',
  'swissmilk.ch',
  'fooby.ch',
  'allrecipes.com',
  'bbcgoodfood.com',
];

const recipeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          servings: { type: 'integer' },
          prepMinutes: { type: 'integer' },
          dishType: { type: 'string', enum: ['sweet', 'savory'] },
          sourceTitle: { type: 'string' },
          sourceUrl: { type: 'string' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                amount: { type: 'string' },
                optional: { type: 'boolean' },
              },
              required: ['name', 'amount', 'optional'],
            },
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
                ingredientAmounts: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['title', 'detail', 'ingredientAmounts'],
            },
          },
        },
        required: [
          'title',
          'description',
          'servings',
          'prepMinutes',
          'dishType',
          'sourceTitle',
          'sourceUrl',
          'ingredients',
          'steps',
        ],
      },
    },
  },
  required: ['recipes'],
} as const;

function pruneCache() {
  const now = Date.now();
  recipeSuggestCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      recipeSuggestCache.delete(key);
    }
  });
  while (recipeSuggestCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = recipeSuggestCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    recipeSuggestCache.delete(oldestKey);
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeToken(token: string) {
  if (token.endsWith('nen') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('en') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('er') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('e') && token.length > 4) {
    return token.slice(0, -1);
  }
  if (token.endsWith('n') && token.length > 4) {
    return token.slice(0, -1);
  }
  if (token.endsWith('s') && token.length > 4) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((t) => singularizeToken(t))
    .filter((t) => t.length >= 3);
}

function isIngredientAvailable(ingredient: string, availableNames: string[]) {
  const ingredientNorm = normalizeText(ingredient);
  if (!ingredientNorm) {
    return false;
  }

  const ingredientTokens = new Set(tokenize(ingredientNorm));
  if (ingredientTokens.size === 0) {
    return false;
  }

  for (const availableRaw of availableNames) {
    const availableNorm = normalizeText(availableRaw);
    if (!availableNorm) {
      continue;
    }

    if (availableNorm === ingredientNorm) {
      return true;
    }

    if (availableNorm.length >= 4 && ingredientNorm.includes(availableNorm)) {
      return true;
    }

    if (ingredientNorm.length >= 4 && availableNorm.includes(ingredientNorm)) {
      return true;
    }

    const availableTokens = tokenize(availableNorm);
    const overlapping = availableTokens.filter((t) => ingredientTokens.has(t));
    if (overlapping.length > 0) {
      return true;
    }
  }

  return false;
}

function buildInventoryCacheKey(userId: string, inventory: InventoryInput[]) {
  const normalized = inventory
    .map((item) => ({
      name: normalizeText(item.name),
      menge:
        item.menge != null && Number.isFinite(item.menge) ? Number(item.menge.toFixed(3)) : null,
      einheit: normalizeText(item.einheit ?? ''),
    }))
    .filter((item) => item.name.length > 0)
    .sort((a, b) => {
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      if (a.einheit !== b.einheit) {
        return a.einheit.localeCompare(b.einheit);
      }
      return (a.menge ?? 0) - (b.menge ?? 0);
    });

  return `${userId}|${JSON.stringify(normalized)}`;
}

function uniqueInventoryForPrompt(inventory: InventoryInput[]) {
  const dedup = new Map<string, InventoryInput>();
  for (const item of inventory) {
    const nameKey = normalizeText(item.name);
    if (!nameKey) {
      continue;
    }

    const existing = dedup.get(nameKey);
    if (!existing) {
      dedup.set(nameKey, item);
      continue;
    }

    const existingAmount = Number.isFinite(Number(existing.menge)) ? Number(existing.menge) : -1;
    const nextAmount = Number.isFinite(Number(item.menge)) ? Number(item.menge) : -1;
    if (nextAmount > existingAmount) {
      dedup.set(nameKey, item);
    }
  }

  return Array.from(dedup.values())
    .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)))
    .slice(0, MAX_INVENTORY_ITEMS);
}

function getHostFromUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    return host;
  } catch {
    return null;
  }
}

function isValidHttpUrl(value: string) {
  return /^https?:\/\/\S+/i.test(value);
}

function hasAmountHint(value: string) {
  return /\b\d+(?:[.,]\d+)?\s?(?:g|kg|ml|l|el|tl|stk|min|minute[n]?|grad|becher|tasse[n]?|prise[n]?)\b/i.test(
    value
  ) || /\b\d+\b/.test(value);
}

function isDetailedStep(step: RecipeStep) {
  if (step.detail.length < 35) {
    return false;
  }

  const combined = `${step.title} ${step.detail}`;
  if (hasAmountHint(combined)) {
    return true;
  }

  return step.ingredientAmounts.some((x) => hasAmountHint(x));
}

function isPlausibleCombination(recipe: RecipeCandidate) {
  const names = recipe.ingredients.map((x) => normalizeText(x.name));
  const hasToken = (token: string) => names.some((name) => name.includes(token));

  if (hasToken('banan') && hasToken('tomat')) {
    return false;
  }

  if (recipe.dishType === 'sweet') {
    const blockedForSweet = ['tomat', 'zwiebel', 'knoblauch', 'paprika', 'thunfisch', 'speck'];
    if (blockedForSweet.some((token) => hasToken(token))) {
      return false;
    }
  }

  return true;
}

function collectWebSourceHosts(response: any) {
  const hosts = new Set<string>();
  const output = Array.isArray(response?.output) ? response.output : [];

  for (const item of output) {
    if (item?.type !== 'web_search_call') {
      continue;
    }

    const candidateArrays: any[] = [];
    if (Array.isArray(item?.action?.sources)) {
      candidateArrays.push(item.action.sources);
    }
    if (Array.isArray(item?.results)) {
      candidateArrays.push(item.results);
    }

    for (const arr of candidateArrays) {
      for (const source of arr) {
        const host = getHostFromUrl(String(source?.url ?? ''));
        if (host) {
          hosts.add(host);
        }
      }
    }
  }

  return hosts;
}

function sanitizeRecipes(
  raw: any,
  sourceHosts: Set<string>,
  webSearchUsed: boolean
): RecipeCandidate[] {
  if (!raw || !Array.isArray(raw.recipes)) {
    return [];
  }

  return raw.recipes
    .map((recipe: any) => {
      const title = typeof recipe?.title === 'string' ? recipe.title.trim() : '';
      const description =
        typeof recipe?.description === 'string' ? recipe.description.trim() : '';
      const dishType = recipe?.dishType === 'sweet' ? 'sweet' : 'savory';
      const servings = Number.isFinite(Number(recipe?.servings))
        ? Math.max(1, Math.round(Number(recipe.servings)))
        : 2;
      const prepMinutes = Number.isFinite(Number(recipe?.prepMinutes))
        ? Math.max(5, Math.round(Number(recipe.prepMinutes)))
        : 25;
      const sourceTitle =
        typeof recipe?.sourceTitle === 'string' ? recipe.sourceTitle.trim() : '';
      const sourceUrl = typeof recipe?.sourceUrl === 'string' ? recipe.sourceUrl.trim() : '';

      if (!title || !description || !sourceTitle || !isValidHttpUrl(sourceUrl)) {
        return null;
      }

      const sourceHost = getHostFromUrl(sourceUrl);
      if (!sourceHost) {
        return null;
      }

      if (webSearchUsed && sourceHosts.size > 0 && !sourceHosts.has(sourceHost)) {
        return null;
      }

      const ingredients = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients
            .map((ing: any) => ({
              name: typeof ing?.name === 'string' ? ing.name.trim() : '',
              amount: typeof ing?.amount === 'string' ? ing.amount.trim() : '',
              optional: Boolean(ing?.optional),
            }))
            .filter((ing: RecipeIngredient) => ing.name.length > 0 && ing.amount.length > 0)
        : [];

      const steps = Array.isArray(recipe?.steps)
        ? recipe.steps
            .map((step: any) => ({
              title: typeof step?.title === 'string' ? step.title.trim() : '',
              detail: typeof step?.detail === 'string' ? step.detail.trim() : '',
              ingredientAmounts: Array.isArray(step?.ingredientAmounts)
                ? step.ingredientAmounts
                    .map((x: any) => (typeof x === 'string' ? x.trim() : ''))
                    .filter((x: string) => x.length > 0)
                : [],
            }))
            .filter((step: RecipeStep) => step.title.length > 0 && step.detail.length > 0)
            .slice(0, 12)
        : [];

      if (ingredients.length < 3 || steps.length < 3) {
        return null;
      }

      const recipeCandidate: RecipeCandidate = {
        title,
        description,
        servings,
        prepMinutes,
        dishType,
        sourceTitle,
        sourceUrl,
        ingredients,
        steps,
      };

      if (!isPlausibleCombination(recipeCandidate)) {
        return null;
      }

      const detailedStepCount = recipeCandidate.steps.filter((step) => isDetailedStep(step)).length;
      if (detailedStepCount < Math.ceil(recipeCandidate.steps.length * 0.8)) {
        return null;
      }

      return recipeCandidate;
    })
    .filter((x: RecipeCandidate | null): x is RecipeCandidate => Boolean(x));
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const inventoryRaw = Array.isArray(body?.inventory) ? body.inventory : [];

    const inventory: InventoryInput[] = inventoryRaw
      .map((item: any) => ({
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        menge: Number.isFinite(Number(item?.menge)) ? Number(item.menge) : undefined,
        einheit: typeof item?.einheit === 'string' ? item.einheit.trim() : undefined,
      }))
      .filter((item: InventoryInput) => item.name.length > 0)
      .slice(0, MAX_INVENTORY_ITEMS * 2);

    if (inventory.length === 0) {
      return NextResponse.json({
        perfectRecipes: [],
        almostRecipes: [],
        webSearchUsed: false,
        webSourceCount: 0,
      });
    }

    const scopedInventory = uniqueInventoryForPrompt(inventory);
    const cacheKey = buildInventoryCacheKey(session.user.id, scopedInventory);

    pruneCache();
    const cached = recipeSuggestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    const inventoryLines = scopedInventory.map((item) => {
      const amountPart =
        item.menge != null ? ` (${item.menge}${item.einheit ? ` ${item.einheit}` : ''})` : '';
      return `- ${item.name}${amountPart}`;
    });

    const systemPrompt =
      'Du bist ein sehr strenger Kochassistent. Antworte nur als valides JSON gemäss Schema.';

    const userPrompt =
      `Aufgabe: Erzeuge Rezeptvorschläge für diesen Vorrat:\n${inventoryLines.join('\n')}\n\n` +
      `Absolute Regeln:\n` +
      `1) Nutze aktiv Websuche und liefere NUR bekannte Standardrezepte mit echter Quelle.\n` +
      `2) Pro Rezept MUSS sourceTitle + sourceUrl auf ein echtes Rezept verweisen.\n` +
      `3) KEINE unplausiblen Mischungen (z.B. Banane + Tomate im selben Gericht).\n` +
      `4) Triff KEINE Vorrats-Annahmen. Grundzutaten (Mehl, Zucker, Eier, Öl, Backpulver ...) immer explizit auffuehren.\n` +
      `5) Schritte müssen detailliert sein: konkrete Mengen, Zeit, ggf. Temperatur.\n` +
      `6) Zutaten und Mengen metrisch und realistisch für Haushalt in DACH.\n` +
      `7) Keine Fantasiegerichte, keine erfundenen Quellen.\n\n` +
      `Ausgabe-Regeln:\n` +
      `- ${TARGET_RECIPE_COUNT} Rezepte liefern.\n` +
      `- dishType nur "sweet" oder "savory".\n` +
      `- ingredients: name + amount + optional.\n` +
      `- steps: title + detail + ingredientAmounts (Liste der in diesem Schritt verwendeten Mengenangaben).\n` +
      `- detail soll vollständig und konkret sein.\n`;

    const requestBase: any = {
      model: 'gpt-5.2',
      temperature: 0.1,
      max_output_tokens: 3200,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'recipe_suggestions_strict',
          strict: true,
          schema: recipeSchema,
        },
      },
    };

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let aiResponse: any;
    let webSearchUsed = true;
    let webSourceHosts = new Set<string>();

    try {
      aiResponse = await client.responses.create({
        ...requestBase,
        tools: [
          {
            type: 'web_search',
            filters: {
              allowed_domains: preferredRecipeDomains,
            },
            search_context_size: 'medium',
            user_location: {
              type: 'approximate',
              country: 'CH',
              city: 'Zurich',
              timezone: 'Europe/Zurich',
            },
          },
        ],
        include: ['web_search_call.results', 'web_search_call.action.sources'],
      });

      webSourceHosts = collectWebSourceHosts(aiResponse);
      if (webSourceHosts.size === 0) {
        webSearchUsed = false;
      }
    } catch (error: any) {
      const msg = String(error?.message ?? '');
      const webToolUnavailable =
        error?.status === 400 ||
        error?.status === 404 ||
        error?.status === 422 ||
        msg.includes('web_search');

      if (!webToolUnavailable) {
        throw error;
      }

      aiResponse = await client.responses.create(requestBase);
      webSearchUsed = false;
      webSourceHosts = new Set<string>();
    }

    const rawText = aiResponse?.output_text?.trim?.() ?? '{"recipes":[]}';

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { recipes: [] };
    }

    let candidates = sanitizeRecipes(parsed, webSourceHosts, webSearchUsed).slice(0, 20);
    if (candidates.length === 0) {
      candidates = sanitizeRecipes(parsed, new Set<string>(), false).slice(0, 20);
    }

    const availableNames = scopedInventory.map((item: InventoryInput) => item.name);

    const enriched = candidates.map((recipe: RecipeCandidate) => {
      const availableIngredients: RecipeIngredient[] = [];
      const missingIngredients: RecipeIngredient[] = [];

      for (const ingredient of recipe.ingredients) {
        const available = isIngredientAvailable(ingredient.name, availableNames);
        if (available) {
          availableIngredients.push(ingredient);
        } else {
          missingIngredients.push(ingredient);
        }
      }

      return {
        ...recipe,
        availableIngredients,
        missingIngredients,
        missingCount: missingIngredients.length,
      };
    });

    const perfectRecipes = enriched
      .filter((r) => r.missingCount === 0)
      .sort((a, b) => b.availableIngredients.length - a.availableIngredients.length)
      .slice(0, 8);

    let almostRecipes = enriched
      .filter((r) => r.missingCount > 0 && r.missingCount <= 5)
      .sort((a, b) => {
        if (a.missingCount !== b.missingCount) {
          return a.missingCount - b.missingCount;
        }
        return a.prepMinutes - b.prepMinutes;
      })
      .slice(0, 12);

    if (perfectRecipes.length === 0 && almostRecipes.length === 0) {
      almostRecipes = enriched
        .sort((a, b) => a.missingCount - b.missingCount)
        .slice(0, 8);
    }

    const payload: SuggestResponsePayload = {
      perfectRecipes,
      almostRecipes,
      webSearchUsed,
      webSourceCount: webSourceHosts.size,
    };

    recipeSuggestCache.set(cacheKey, {
      expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'OpenAI Kontingent/Quota ueberschritten.' },
        { status: 429 }
      );
    }

    console.error('Fehler bei Rezeptvorschlägen:', error?.message || error);
    return NextResponse.json(
      { error: 'Serverfehler bei Rezeptvorschlägen' },
      { status: 500 }
    );
  }
}
