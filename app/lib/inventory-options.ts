import prisma from '@/app/lib/prisma';
import { DEFAULT_INVENTORY_CATEGORIES, DEFAULT_INVENTORY_UNITS } from '@/app/lib/user-settings';

const FALLBACK_CATEGORIES = [...DEFAULT_INVENTORY_CATEGORIES];
const FALLBACK_UNITS = [...DEFAULT_INVENTORY_UNITS];

function normalizeStringList(values: unknown, maxLen = 40): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > maxLen) {
      continue;
    }

    unique.add(cleaned);
  }

  return Array.from(unique).slice(0, 100);
}

function parseStoredList(raw: unknown, fallback: string[], maxLen = 40): string[] {
  if (typeof raw !== 'string' || !raw.trim()) {
    return [...fallback];
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeStringList(parsed, maxLen);
    if (normalized.length === 0) {
      return [...fallback];
    }
    return normalized;
  } catch {
    return [...fallback];
  }
}

function pickDefault(preferred: string, values: string[], fallback: string): string {
  if (values.includes(preferred)) {
    return preferred;
  }
  return values[0] || fallback;
}

export type InventoryOptions = {
  categories: string[];
  units: string[];
  defaultCategory: string;
  defaultUnit: string;
};

export async function getInventoryOptionsForUser(
  userId: string | null | undefined
): Promise<InventoryOptions> {
  if (!userId) {
    return {
      categories: [...FALLBACK_CATEGORIES],
      units: [...FALLBACK_UNITS],
      defaultCategory: pickDefault('Sonstiges', FALLBACK_CATEGORIES, 'Sonstiges'),
      defaultUnit: pickDefault('Stk', FALLBACK_UNITS, 'Stk'),
    };
  }

  const settingsRaw = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const settings = settingsRaw as any;

  const categories = parseStoredList(settings?.inventoryCategories, FALLBACK_CATEGORIES);
  const units = parseStoredList(settings?.inventoryUnits, FALLBACK_UNITS, 20);

  return {
    categories,
    units,
    defaultCategory: pickDefault('Sonstiges', categories, 'Sonstiges'),
    defaultUnit: pickDefault('Stk', units, 'Stk'),
  };
}
