import { pool } from "../config/database.js";

export const create = async ({ nombre, email, mensaje }) => {
  const [result] = await pool.query(
    "INSERT INTO contact_messages (nombre, email, mensaje) VALUES (?, ?, ?)",
    [nombre, email, mensaje],
  );
  return result.insertId;
};

export const getAll = async ({ limit, offset, search, leido }) => {
  let where = "WHERE 1=1";
  const params = [];

  if (search) {
    where += " AND (nombre LIKE ? OR email LIKE ? OR mensaje LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (leido === "0" || leido === "1") {
    where += " AND leido = ?";
    params.push(Number(leido));
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM contact_messages ${where}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
};

export const markAsRead = async (id, leido) => {
  await pool.query("UPDATE contact_messages SET leido = ? WHERE id = ?", [
    leido ? 1 : 0,
    id,
  ]);
};
