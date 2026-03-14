'use client';

type LoadProductsResponse = {
  produkte?: unknown[];
  error?: string;
};

const CACHE_TTL_MS = 15000;

let cachedProducts: unknown[] | null = null;
let cachedAt = 0;
let inFlight: Promise<unknown[]> | null = null;

function isCacheFresh() {
  return cachedProducts != null && Date.now() - cachedAt < CACHE_TTL_MS;
}

export function invalidateProductsCache() {
  cachedProducts = null;
  cachedAt = 0;
}

export function primeProductsCache(products: unknown[]) {
  cachedProducts = products;
  cachedAt = Date.now();
}

export async function loadProductsCached(options?: { force?: boolean }) {
  const force = Boolean(options?.force);

  if (!force && isCacheFresh()) {
    return cachedProducts as unknown[];
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const res = await fetch('/api/load-products', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const data = (await res.json().catch(() => ({}))) as LoadProductsResponse;
    if (!res.ok) {
      throw new Error(data?.error || 'Produkte konnten nicht geladen werden.');
    }

    const products = Array.isArray(data?.produkte) ? data.produkte : [];
    primeProductsCache(products);
    return products;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
