import mysql from "mysql2/promise";
import {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_CONNECTION_LIMIT,
} from "./env.js";

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: Number(DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "-05:00", // Lima, Perú
  charset: "utf8mb4",
});

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log(`✅  MySQL conectado — base de datos: ${DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error("❌  Error conectando a MySQL:", err.message);
    process.exit(1);
  }
};
