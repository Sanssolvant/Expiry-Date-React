import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

// GET: Hole User-Einstellungen
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings || {});
  } catch (error: any) {
    console.error('❌ Fehler beim Abholen der Settings:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Abholen der Settings' }, { status: 500 });
  }
}

// POST: Speichere User-Einstellungen
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const body = await req.json();
    const { warnLevelBald, warnLevelExpired } = body;

    const updated = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        warnLevelBald,
        warnLevelExpired,
      },
      create: {
        userId: session.user.id,
        warnLevelBald,
        warnLevelExpired,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('❌ Fehler beim Speichern der Settings:', error?.message || error);
    return NextResponse.json(
      { error: 'Serverfehler beim Speichern der Settings' },
      { status: 500 }
    );
  }
}
