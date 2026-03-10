// app/api/load-products/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true, // 🔥 ganz wichtig!
    },
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  try {
    const orderBy: any = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
    const produkte = await prisma.produkt.findMany({
      where: { userId: session.user.id },
      orderBy,
    });

    return NextResponse.json({ produkte });
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}
