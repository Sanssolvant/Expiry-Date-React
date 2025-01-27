import { NextResponse } from 'next/server';
import { createPool } from '../../lib/db'; // Importiere die Verbindungslogik

export async function GET() {
  try {
    const connection = await createPool();

    // Beispiel-Query: Alle Benutzer abrufen
    const [users] = await connection.execute('SELECT * FROM users');

    // JSON-Antwort zurückgeben
    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Abrufen der Daten' }, { status: 500 });
  }
}
