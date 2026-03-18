import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';
import { createR2PublicUrl, extractR2KeyFromUrl, isR2KeyOwnedByUser } from '@/app/lib/r2';

const MIN_BARCODE_LEN = 6;
const MAX_BARCODE_LEN = 64;
const MAX_NAME_LEN = 80;
const MAX_CATEGORY_LEN = 40;
const MAX_UNIT_LEN = 20;

function normalizeBarcodeInput(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\dA-Za-z\-]/g, '')
    .toUpperCase();

  if (normalized.length < MIN_BARCODE_LEN || normalized.length > MAX_BARCODE_LEN) {
    return null;
  }

  return normalized;
}

function normalizeTextInput(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maxLen) {
    return null;
  }

  return normalized;
}

function normalizeOptionalUnit(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > MAX_UNIT_LEN) {
    return null;
  }

  return normalized;
}

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const barcode = normalizeBarcodeInput(req.nextUrl.searchParams.get('barcode'));
    if (!barcode) {
      return NextResponse.json({ error: 'Ungueltiger Barcode' }, { status: 400 });
    }

    const template = await prisma.barcodeTemplate.findUnique({
      where: {
        userId_barcode: {
          userId: session.user.id,
          barcode,
        },
      },
      select: {
        barcode: true,
        name: true,
        kategorie: true,
        bildUrl: true,
        einheit: true,
      },
    });

    if (!template) {
      return NextResponse.json({ found: false, barcode });
    }

    return NextResponse.json({
      found: true,
      barcode: template.barcode,
      template: {
        name: template.name,
        kategorie: template.kategorie,
        image: template.bildUrl || '',
        einheit: template.einheit || '',
      },
    });
  } catch (error: any) {
    console.error('Fehler bei Barcode-Vorlage GET:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await req.json();

    const barcode = normalizeBarcodeInput(body?.barcode);
    const name = normalizeTextInput(body?.name, MAX_NAME_LEN);
    const kategorie = normalizeTextInput(body?.kategorie, MAX_CATEGORY_LEN);
    const einheit = normalizeOptionalUnit(body?.einheit);
    const bildUrl = normalizeImageUrlForUser(body?.image, session.user.id);

    if (!barcode || !name || !kategorie) {
      return NextResponse.json(
        { error: 'Barcode, Name und Kategorie sind erforderlich und müssen gültig sein.' },
        { status: 400 }
      );
    }

    const saved = await prisma.barcodeTemplate.upsert({
      where: {
        userId_barcode: {
          userId: session.user.id,
          barcode,
        },
      },
      update: {
        name,
        kategorie,
        bildUrl,
        einheit,
      },
      create: {
        userId: session.user.id,
        barcode,
        name,
        kategorie,
        bildUrl,
        einheit,
      },
      select: {
        barcode: true,
        name: true,
        kategorie: true,
        bildUrl: true,
        einheit: true,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        barcode: saved.barcode,
        name: saved.name,
        kategorie: saved.kategorie,
        image: saved.bildUrl || '',
        einheit: saved.einheit || '',
      },
    });
  } catch (error: any) {
    console.error('Fehler bei Barcode-Vorlage POST:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

