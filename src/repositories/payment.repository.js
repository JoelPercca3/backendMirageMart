import { pool } from "../config/database.js";

export const create = async (
  { order_id, metodo, monto, moneda, pasarela },
  conn = pool,
) => {
  const [result] = await conn.query(
    `INSERT INTO payments (order_id, metodo, estado, monto, moneda, pasarela)
     VALUES (?, ?, 'pendiente', ?, ?, ?)`,
    [order_id, metodo, monto, moneda || "PEN", pasarela || null],
  );
  return result.insertId;
};

export const updateStatus = async (
  orderId,
  estado,
  referencia,
  respuesta,
  conn = pool,
) => {
  await conn.query(
    `UPDATE payments SET estado = ?, referencia_externa = ?, respuesta_pasarela = ?,
      paid_at = IF(? = 'completado', NOW(), NULL)
     WHERE order_id = ?`,
    [
      estado,
      referencia || null,
      respuesta ? JSON.stringify(respuesta) : null,
      estado,
      orderId,
    ],
  );
};

export const findByOrder = async (orderId) => {
  const [rows] = await pool.query(
    "SELECT * FROM payments WHERE order_id = ? LIMIT 1",
    [orderId],
  );
  return rows[0] || null;
};

export const getAll = async ({ limit, offset }) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM payments",
  );
  const [rows] = await pool.query(
    `SELECT p.*, o.codigo_orden, u.nombre as cliente, u.email
     FROM payments p
     JOIN orders o ON p.order_id = o.id
     JOIN users u ON o.user_id = u.id
     ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return { rows, total };
};
