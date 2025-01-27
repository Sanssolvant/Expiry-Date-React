import mysql from 'mysql2/promise';

let pool: mysql.Pool;

export const createPool = async () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT),
      connectionLimit: 10, // Maximale Anzahl gleichzeitiger Verbindungen
    });
  }
  return pool;
};
