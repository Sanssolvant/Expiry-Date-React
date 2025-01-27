import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    // Verbindung zur Datenbank herstellen
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST, // Docker-Host
      user: process.env.DB_USER, // MySQL-Benutzer
      password: process.env.DB_PASSWORD, // Passwort
      database: process.env.DB_DATABASE, // Datenbankname
      port: Number(process.env.DB_PORT), // MySQL-Port
    });

    // Beispiel-Query: Alle Benutzer abrufen
    const [rows] = await connection.execute('SELECT * FROM users');
    connection.end();

    // JSON-Antwort zurückgeben
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Datenbankfehler:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Daten' }, { status: 500 });
  }
}
