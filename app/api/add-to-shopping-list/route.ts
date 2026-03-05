import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const amount = typeof body?.amount === 'string' ? body.amount.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Produktname fehlt' }, { status: 400 });
    }

    const userId = session.user.id;

    const existing = await prisma.shoppingItem.findFirst({
      where: {
        userId,
        name,
        amount,
        done: false,
        groupId: null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ success: true, created: false, itemId: existing.id });
    }

    const highestOrderItem = await prisma.shoppingItem.findFirst({
      where: { userId, groupId: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const nextOrder = (highestOrderItem?.order ?? -1) + 1;

    const created = await prisma.shoppingItem.create({
      data: {
        userId,
        name,
        amount,
        done: false,
        order: nextOrder,
        groupId: null,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, created: true, itemId: created.id });
  } catch (error: any) {
    console.error('Fehler beim Hinzufügen zum Einkaufszettel:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Hinzufügen' }, { status: 500 });
  }
}
