import { pool } from "../config/database.js";

export const create = async ({
  order_id,
  user_id,
  motivo,
  comentario,
  monto_solicitado,
}) => {
  const [result] = await pool.query(
    `INSERT INTO refund_requests (order_id, user_id, motivo, comentario, monto_solicitado)
     VALUES (?, ?, ?, ?, ?)`,
    [order_id, user_id, motivo, comentario || null, monto_solicitado],
  );
  return result.insertId;
};

export const findPendingByOrder = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT * FROM refund_requests WHERE order_id = ? AND estado = 'pendiente' LIMIT 1`,
    [orderId],
  );
  return rows[0] || null;
};

export const findLatestByOrder = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT * FROM refund_requests WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
    [orderId],
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM refund_requests WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

export const getAll = async ({ limit, offset, estado }) => {
  const params = [];
  let where = "WHERE 1=1";
  if (estado) {
    where += " AND rr.estado = ?";
    params.push(estado);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM refund_requests rr ${where}`,
    params,
  );
  const [rows] = await pool.query(
    `SELECT rr.*, o.codigo_orden, o.total AS order_total, u.nombre AS cliente, u.email
     FROM refund_requests rr
     JOIN orders o ON rr.order_id = o.id
     JOIN users u ON rr.user_id = u.id
     ${where}
     ORDER BY rr.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { rows, total };
};

export const approve = async (id, { refund_id, reviewed_by }) => {
  await pool.query(
    `UPDATE refund_requests SET estado = 'aprobado', refund_id = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [refund_id, reviewed_by, id],
  );
};

export const reject = async (id, { respuesta_admin, reviewed_by }) => {
  await pool.query(
    `UPDATE refund_requests SET estado = 'rechazado', respuesta_admin = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [respuesta_admin || null, reviewed_by, id],
  );
};
