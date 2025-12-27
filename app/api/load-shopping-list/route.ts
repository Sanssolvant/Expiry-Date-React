import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const userId = session.user.id;

    const groups = await prisma.shoppingGroup.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    const items = await prisma.shoppingItem.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ groups, items });
  } catch (error: any) {
    console.error('❌ Fehler beim Laden Einkaufszettel:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Laden' }, { status: 500 });
  }
}
