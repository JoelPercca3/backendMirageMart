import { pool } from "../config/database.js";

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT * FROM newsletter_subscribers WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};

export const create = async (email) => {
  const [result] = await pool.query(
    "INSERT INTO newsletter_subscribers (email) VALUES (?)",
    [email],
  );
  return result.insertId;
};

export const reactivate = async (id) => {
  await pool.query(
    "UPDATE newsletter_subscribers SET activo = 1 WHERE id = ?",
    [id],
  );
};

export const setActivo = async (id, activo) => {
  await pool.query(
    "UPDATE newsletter_subscribers SET activo = ? WHERE id = ?",
    [activo ? 1 : 0, id],
  );
};

export const getAll = async ({ limit, offset, search, activo }) => {
  let where = "WHERE 1=1";
  const params = [];

  if (search) {
    where += " AND email LIKE ?";
    params.push(`%${search}%`);
  }
  if (activo === "0" || activo === "1") {
    where += " AND activo = ?";
    params.push(Number(activo));
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM newsletter_subscribers ${where}`,
    params,
  );
  const [rows] = await pool.query(
    `SELECT * FROM newsletter_subscribers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
};
