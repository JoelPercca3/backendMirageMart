import { pool } from "../config/database.js";

export const getCulqiCustomerId = async (userId) => {
  const [[row]] = await pool.query(
    "SELECT culqi_customer_id FROM users WHERE id = ?",
    [userId],
  );
  return row?.culqi_customer_id || null;
};

export const saveCulqiCustomerId = async (userId, customerId) => {
  await pool.query("UPDATE users SET culqi_customer_id = ? WHERE id = ?", [
    customerId,
    userId,
  ]);
};

export const getUserBasicInfo = async (userId) => {
  const [[row]] = await pool.query(
    "SELECT nombre, email, telefono FROM users WHERE id = ?",
    [userId],
  );
  return row;
};

export const create = async ({
  user_id,
  culqi_card_id,
  tipo,
  marca,
  ultimos4,
  es_principal,
}) => {
  const [result] = await pool.query(
    `INSERT INTO payment_methods (user_id, culqi_card_id, tipo, marca, ultimos4, es_principal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      culqi_card_id,
      tipo,
      marca || null,
      ultimos4 || null,
      es_principal ? 1 : 0,
    ],
  );
  return result.insertId;
};

export const getByUser = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY es_principal DESC, created_at DESC",
    [userId],
  );
  return rows;
};

export const findById = async (id, userId) => {
  const [[row]] = await pool.query(
    "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return row || null;
};

export const remove = async (id, userId) => {
  const [result] = await pool.query(
    "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows > 0;
};

export const unsetDefaults = async (userId) => {
  await pool.query(
    "UPDATE payment_methods SET es_principal = 0 WHERE user_id = ?",
    [userId],
  );
};

export const setDefault = async (id, userId) => {
  await unsetDefaults(userId);
  const [result] = await pool.query(
    "UPDATE payment_methods SET es_principal = 1 WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows > 0;
};

export const countByUser = async (userId) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM payment_methods WHERE user_id = ?",
    [userId],
  );
  return total;
};
