import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Kein Bild erhalten' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filename = `${Date.now()}-${randomUUID()}-${file.name}`.replace(/\s+/g, '-');
  const filePath = path.join(process.cwd(), 'public/uploads', filename);

  try {
    const resized = await sharp(buffer)
      .rotate() // Korrigiert EXIF-Ausrichtung
      .toFormat('jpeg') // 🔥 zwingt JPEG-Neu-Encoding
      .resize({
        width: 800,
        withoutEnlargement: true,
      })
      .jpeg({ quality: 75 })
      .toBuffer();

    await writeFile(filePath, resized);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Fehler beim Bildverarbeiten:', error);
    return NextResponse.json({ error: 'Bildverarbeitung fehlgeschlagen' }, { status: 500 });
  }
}
