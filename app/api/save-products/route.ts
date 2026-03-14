import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { formatDateToDb } from '@/app/lib/dateUtils';
import prisma from '@/app/lib/prisma';
import {
  createR2PublicUrl,
  deleteObjectFromR2,
  extractR2KeyFromUrl,
  isR2KeyOwnedByUser,
} from '@/app/lib/r2';

type IncomingCard = {
  id?: unknown;
  name?: unknown;
  menge?: unknown;
  einheit?: unknown;
  ablaufdatum?: unknown;
  erfasstAm?: unknown;
  kategorie?: unknown;
  image?: unknown;
};

type NormalizedCard = {
  id: string | null;
  name: string;
  menge: number;
  einheit: string;
  ablaufdatum: Date;
  erfasstAm: Date;
  kategorie: string;
  bildUrl: string;
  sortOrder: number;
};

type ExistingProduct = {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  ablaufdatum: Date;
  erfasstAm: Date;
  kategorie: string;
  bildUrl: string;
  sortOrder: number;
};

function normalizeImageUrlForUser(value: unknown, userId: string) {
  if (typeof value !== 'string') {
    return '';
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return '';
  }

  let key: string | null = null;
  try {
    key = extractR2KeyFromUrl(cleaned);
  } catch {
    key = null;
  }

  if (!key) {
    return cleaned;
  }

  if (!isR2KeyOwnedByUser(key, userId)) {
    return '';
  }

  return createR2PublicUrl(key);
}

async function cleanupRemovedImages(previousUrls: string[], nextUrls: Set<string>, userId: string) {
  const staleUrls = Array.from(new Set(previousUrls.filter((url) => url && !nextUrls.has(url))));
  if (staleUrls.length === 0) {
    return;
  }

  await Promise.allSettled(
    staleUrls.map(async (url) => {
      let key: string | null = null;
      try {
        key = extractR2KeyFromUrl(url);
      } catch {
        key = null;
      }

      if (!key || !isR2KeyOwnedByUser(key, userId)) {
        return;
      }

      try {
        await deleteObjectFromR2(key);
      } catch (error) {
        console.warn('Bild konnte nicht aus R2 geloescht werden:', url, error);
      }
    })
  );
}

function normalizeCard(card: IncomingCard, index: number, userId: string): NormalizedCard | null {
  if (
    !card ||
    typeof card.name !== 'string' ||
    card.name.trim().length === 0 ||
    typeof card.ablaufdatum !== 'string' ||
    typeof card.erfasstAm !== 'string'
  ) {
    return null;
  }

  const id = typeof card.id === 'string' && card.id.trim().length > 0 ? card.id.trim() : null;
  const mengeRaw = Number(card.menge);
  const menge = Number.isFinite(mengeRaw) ? mengeRaw : 0;

  return {
    id,
    name: card.name.trim(),
    menge,
    einheit: typeof card.einheit === 'string' && card.einheit.trim() ? card.einheit.trim() : 'Stk',
    ablaufdatum: formatDateToDb(card.ablaufdatum),
    erfasstAm: formatDateToDb(card.erfasstAm),
    kategorie: typeof card.kategorie === 'string' ? card.kategorie.trim() : '',
    bildUrl: normalizeImageUrlForUser(card.image, userId),
    sortOrder: index,
  };
}

function sameProductData(existing: ExistingProduct, incoming: NormalizedCard) {
  return (
    existing.name === incoming.name &&
    Number(existing.menge) === Number(incoming.menge) &&
    existing.einheit === incoming.einheit &&
    existing.ablaufdatum.getTime() === incoming.ablaufdatum.getTime() &&
    existing.erfasstAm.getTime() === incoming.erfasstAm.getTime() &&
    existing.kategorie === incoming.kategorie &&
    (existing.bildUrl || '') === (incoming.bildUrl || '') &&
    existing.sortOrder === incoming.sortOrder
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const { cards } = body ?? {};

    if (!Array.isArray(cards)) {
      return NextResponse.json({ error: 'Ungueltige Datenstruktur' }, { status: 400 });
    }

    const existingProducts = (await prisma.produkt.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        menge: true,
        einheit: true,
        ablaufdatum: true,
        erfasstAm: true,
        kategorie: true,
        bildUrl: true,
        sortOrder: true,
      } as any,
    })) as unknown as ExistingProduct[];

    const previousUrls = existingProducts
      .map((p) => normalizeImageUrlForUser(p.bildUrl, userId))
      .filter(Boolean);

    if (cards.length === 0) {
      const deleted = await prisma.produkt.deleteMany({ where: { userId } });
      await cleanupRemovedImages(previousUrls, new Set(), userId);
      return NextResponse.json({ success: true, deleted: deleted.count });
    }

    const normalizedCards = (cards as IncomingCard[])
      .map((card, index) => normalizeCard(card, index, userId))
      .filter((card): card is NormalizedCard => card != null);

    if (normalizedCards.length === 0) {
      return NextResponse.json({ error: 'Keine gueltigen Karten zum Speichern' }, { status: 400 });
    }

    const existingById = new Map(existingProducts.map((product) => [product.id, product]));
    const seenUpdateIds = new Set<string>();
    const updates: Array<{ id: string; card: NormalizedCard }> = [];
    const creates: NormalizedCard[] = [];

    for (const card of normalizedCards) {
      if (card.id && existingById.has(card.id) && !seenUpdateIds.has(card.id)) {
        updates.push({ id: card.id, card });
        seenUpdateIds.add(card.id);
        continue;
      }

      creates.push(card);
    }

    const deletedIds = existingProducts
      .map((product) => product.id)
      .filter((id) => !seenUpdateIds.has(id));

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      if (deletedIds.length > 0) {
        await tx.produkt.deleteMany({
          where: {
            userId,
            id: { in: deletedIds },
          },
        });
      }

      for (const entry of updates) {
        const existing = existingById.get(entry.id);
        if (!existing || sameProductData(existing, entry.card)) {
          continue;
        }

        await tx.produkt.update({
          where: { id: entry.id },
          data: {
            name: entry.card.name,
            menge: entry.card.menge,
            einheit: entry.card.einheit,
            ablaufdatum: entry.card.ablaufdatum,
            erfasstAm: entry.card.erfasstAm,
            kategorie: entry.card.kategorie,
            bildUrl: entry.card.bildUrl,
            sortOrder: entry.card.sortOrder,
          } as any,
        });

        updatedCount += 1;
      }

      for (const card of creates) {
        const baseData = {
          userId,
          name: card.name,
          menge: card.menge,
          einheit: card.einheit,
          ablaufdatum: card.ablaufdatum,
          erfasstAm: card.erfasstAm,
          kategorie: card.kategorie,
          bildUrl: card.bildUrl,
          sortOrder: card.sortOrder,
        };

        try {
          await tx.produkt.create({
            data: (card.id ? { id: card.id, ...baseData } : baseData) as any,
          });
        } catch (error: any) {
          if (card.id && error?.code === 'P2002') {
            await tx.produkt.create({ data: baseData as any });
          } else {
            throw error;
          }
        }

        createdCount += 1;
      }
    });

    const nextImageUrls = new Set(normalizedCards.map((card) => card.bildUrl).filter(Boolean));
    await cleanupRemovedImages(previousUrls, nextImageUrls, userId);

    return NextResponse.json({
      success: true,
      count: normalizedCards.length,
      created: createdCount,
      updated: updatedCount,
      deleted: deletedIds.length,
    });
  } catch (error: any) {
    console.error('Fehler beim Speichern:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
