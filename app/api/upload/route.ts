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

  const filename = `${Date.now()}-${randomUUID()}-${file.name}`;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  try {
    const resized = await sharp(buffer)
      .rotate() // 🔥 Dreht Bild basierend auf EXIF-Ausrichtung
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
