// app/api/users/addUser.ts
import { NextResponse } from 'next/server';
import { createPool } from '../../lib/db'; // Importiere die Verbindungslogik

export async function POST(request: Request) {
  const { name, email } = await request.json();

  try {
    const connection = await createPool();
    const [result] = await connection.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      name,
      email,
    ]);

    return NextResponse.json({ message: 'Benutzer hinzugefügt', data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Hinzufügen des Benutzers' }, { status: 500 });
  }
}
