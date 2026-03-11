import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { formatDateToDb } from '@/app/lib/dateUtils';
import prisma from '@/app/lib/prisma';
import { deleteObjectFromR2, extractR2KeyFromUrl } from '@/app/lib/r2';

type IncomingCard = {
  name?: unknown;
  menge?: unknown;
  einheit?: unknown;
  ablaufdatum?: unknown;
  erfasstAm?: unknown;
  kategorie?: unknown;
  image?: unknown;
};

async function cleanupRemovedImages(previousUrls: string[], nextUrls: Set<string>) {
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

      if (!key) {
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const { cards } = body;

    if (!Array.isArray(cards)) {
      return NextResponse.json({ error: 'Ungueltige Datenstruktur' }, { status: 400 });
    }

    const previousProducts = await prisma.produkt.findMany({
      where: { userId },
      select: { bildUrl: true },
    });
    const previousUrls = previousProducts
      .map((p) => (typeof p.bildUrl === 'string' ? p.bildUrl.trim() : ''))
      .filter(Boolean);

    if (cards.length === 0) {
      const deleted = await prisma.produkt.deleteMany({ where: { userId } });
      await cleanupRemovedImages(previousUrls, new Set());
      return NextResponse.json({ success: true, deleted: deleted.count });
    }

    const validCards = (cards as IncomingCard[]).filter(
      (card) =>
        card &&
        typeof card.name === 'string' &&
        card.name.trim().length > 0 &&
        typeof card.ablaufdatum === 'string' &&
        typeof card.erfasstAm === 'string'
    );

    if (validCards.length === 0) {
      return NextResponse.json({ error: 'Keine gueltigen Karten zum Speichern' }, { status: 400 });
    }

    const nextImageUrls = new Set(
      validCards
        .map((card) => (typeof card.image === 'string' ? card.image.trim() : ''))
        .filter(Boolean)
    );

    await prisma.produkt.deleteMany({ where: { userId } });

    const data: any[] = validCards.map((card, index) => ({
      userId,
      name: card.name,
      menge: Number(card.menge),
      einheit: typeof card.einheit === 'string' ? card.einheit : 'Stk',
      ablaufdatum: formatDateToDb(card.ablaufdatum as string),
      erfasstAm: formatDateToDb(card.erfasstAm as string),
      kategorie: typeof card.kategorie === 'string' ? card.kategorie : '',
      bildUrl: typeof card.image === 'string' ? card.image : '',
      sortOrder: index,
    }));

    const result = await prisma.produkt.createMany({ data: data as any });
    await cleanupRemovedImages(previousUrls, nextImageUrls);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('Fehler beim Speichern:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
