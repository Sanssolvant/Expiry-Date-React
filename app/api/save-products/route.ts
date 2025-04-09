import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { formatDateToDb } from '@/app/lib/dateUtils';
import prisma from '@/app/lib/prisma';

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
      return NextResponse.json({ error: 'Ungültige Datenstruktur' }, { status: 400 });
    }

    // 👉 Wenn keine Karten mehr da sind → lösche alle des Users
    if (cards.length === 0) {
      const deleted = await prisma.produkt.deleteMany({
        where: { userId },
      });

      return NextResponse.json({ success: true, deleted: deleted.count });
    }

    // 🔍 Nur gültige Karten durchlassen
    const validCards = cards.filter(
      (card) =>
        card &&
        typeof card.name === 'string' &&
        card.name.trim().length > 0 &&
        typeof card.ablaufdatum === 'string' &&
        typeof card.erfasstAm === 'string'
    );

    if (validCards.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Karten zum Speichern' }, { status: 400 });
    }

    // 🧹 Vorher alle Produkte löschen
    await prisma.produkt.deleteMany({
      where: { userId },
    });

    // ✅ Neue Karten speichern
    const data = validCards.map((card) => ({
      userId,
      name: card.name,
      menge: Number(card.menge),
      einheit: card.einheit,
      ablaufdatum: formatDateToDb(card.ablaufdatum),
      erfasstAm: formatDateToDb(card.erfasstAm),
      kategorie: card.kategorie,
      bildUrl: card.image || '',
    }));

    const result = await prisma.produkt.createMany({ data });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('❌ Fehler beim Speichern:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
