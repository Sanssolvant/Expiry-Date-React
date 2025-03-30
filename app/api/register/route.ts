// import { NextResponse } from 'next/server';
// import bcrypt from 'bcrypt';
// import { createPool } from '@/app/lib/db';

// const saltRounds = 10;

// export async function POST(req: Request) {
//   const { username, email, password } = await req.json();

//   // Überprüfen der Eingaben auf Mindestanforderungen
//   if (!username || !email || !password) {
//     return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 });
//   }

//   try {
//     // SQL-Query mit parameterisierten Eingaben (verhindert SQL-Injektionen)
//     const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

//     const connection = await createPool();

//     // Warten auf das Ergebnis der Datenbankabfrage mit Promise
//     await connection.execute(query, [username, email, await bcrypt.hash(password, saltRounds)]);

//     // Erfolgreiche Registrierung
//     return NextResponse.json({ message: 'Benutzer erfolgreich registriert!' }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: 'Es ist ein Fehler aufgetreten!' }, { status: 500 });
//   }
// }
