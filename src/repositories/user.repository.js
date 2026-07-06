import { pool } from "../config/database.js";

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    // 👇 AGREGAR: tipo_documento, numero_documento
    "SELECT id, nombre, email, telefono, tipo_documento, numero_documento, avatar_url, rol, activo, email_verificado, created_at FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] || null;
};

export const create = async ({
  nombre,
  email,
  password_hash,
  telefono,
  token_verificacion,
  avatar_url, // ← AGREGAR
}) => {
  const [result] = await pool.query(
    "INSERT INTO users (nombre, email, password_hash, telefono, token_verificacion) VALUES (?, ?, ?, ?, ?)",
    [nombre, email, password_hash, telefono || null, token_verificacion],
  );
  return result.insertId;
};

export const update = async (id, fields) => {
  const allowed = [
    "nombre",
    "telefono",
    "tipo_documento", // 👈 NUEVO
    "numero_documento", // 👈 NUEVO
    "avatar_url",
    "password_hash",
    "activo",
    "rol",
    "email_verificado",
    "token_reset_password",
    "token_reset_expires",
    "token_verificacion",
    "ultimo_login",
  ];
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (!sets.length) return false;
  values.push(id);
  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
  return true;
};

export const findByResetToken = async (token) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE token_reset_password = ? AND token_reset_expires > NOW() LIMIT 1",
    [token],
  );
  return rows[0] || null;
};

export const findByVerifyToken = async (token) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE token_verificacion = ? LIMIT 1",
    [token],
  );
  return rows[0] || null;
};

export const getAll = async ({ limit, offset, search, rol }) => {
  let where = "WHERE 1=1";
  const params = [];
  if (search) {
    where += " AND (nombre LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (rol) {
    where += " AND rol = ?";
    params.push(rol);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM users ${where}`,
    params,
  );
  const [rows] = await pool.query(
    `SELECT id, nombre, email, telefono, rol, activo, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { rows, total };
};
