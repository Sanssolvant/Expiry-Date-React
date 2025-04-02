import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10, // Je nach Server-Ressourcen skalieren
  queueLimit: 0, // Unendlich viele wartende Anfragen erlaubt
  enableKeepAlive: true, // Verhindert Timeouts bei inaktiven Verbindungen
  keepAliveInitialDelay: 10000, // 10 Sekunden
});
