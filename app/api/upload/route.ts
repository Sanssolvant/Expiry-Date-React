import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/app/lib/auth';
import { createR2ObjectKey, createR2PublicUrl, putObjectToR2 } from '@/app/lib/r2';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Kein Bild erhalten' }, { status: 400 });
  }

  if (!file.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'Nur Bilddateien sind erlaubt' }, { status: 400 });
  }

  const maxUploadBytes = 10 * 1024 * 1024;
  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: 'Bild ist zu gross (max. 10 MB)' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const resized = await sharp(buffer)
      .rotate()
      .resize({
        width: 1200,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const key = createR2ObjectKey(session.user.id, 'webp');
    await putObjectToR2({
      key,
      body: resized,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    return NextResponse.json({ url: createR2PublicUrl(key), key });
  } catch (error) {
    console.error('Fehler beim Bildverarbeiten:', error);
    const message = error instanceof Error ? error.message : 'Bild-Upload fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
