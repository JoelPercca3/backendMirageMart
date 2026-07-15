import { pool } from "../config/database.js";

export const create = async ({
  order_id,
  order_item_id,
  user_id,
  motivo,
  comentario,
  cantidad,
  fotos,
  monto_reembolso,
}) => {
  const [result] = await pool.query(
    `INSERT INTO return_requests
      (order_id, order_item_id, user_id, motivo, comentario, cantidad, fotos, monto_reembolso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order_id,
      order_item_id,
      user_id,
      motivo,
      comentario || null,
      cantidad,
      JSON.stringify(fotos),
      monto_reembolso,
    ],
  );
  return result.insertId;
};

export const findActiveByOrderItem = async (orderItemId) => {
  const [rows] = await pool.query(
    `SELECT * FROM return_requests
     WHERE order_item_id = ? AND estado IN ('pendiente','aprobado','recibido')
     LIMIT 1`,
    [orderItemId],
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM return_requests WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

export const findByOrderItem = async (orderItemId) => {
  const [rows] = await pool.query(
    `SELECT * FROM return_requests WHERE order_item_id = ? ORDER BY id DESC LIMIT 1`,
    [orderItemId],
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
    `SELECT COUNT(*) as total FROM return_requests rr ${where}`,
    params,
  );
  const [rows] = await pool.query(
    `SELECT rr.*, o.codigo_orden, u.nombre AS cliente, u.email,
            oi.nombre_producto, oi.imagen_url, oi.precio_unitario
     FROM return_requests rr
     JOIN orders o ON rr.order_id = o.id
     JOIN users u ON rr.user_id = u.id
     JOIN order_items oi ON rr.order_item_id = oi.id
     ${where}
     ORDER BY rr.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { rows, total };
};

export const approve = async (id, { instrucciones_admin, reviewed_by }) => {
  await pool.query(
    `UPDATE return_requests
     SET estado = 'aprobado', instrucciones_admin = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [instrucciones_admin || null, reviewed_by, id],
  );
};

export const reject = async (id, { respuesta_admin, reviewed_by }) => {
  await pool.query(
    `UPDATE return_requests
     SET estado = 'rechazado', respuesta_admin = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [respuesta_admin || null, reviewed_by, id],
  );
};

export const markReceived = async (id, receivedBy) => {
  await pool.query(
    `UPDATE return_requests SET estado = 'recibido', received_by = ?, received_at = NOW() WHERE id = ?`,
    [receivedBy, id],
  );
};

export const markRefunded = async (id, refundRowId) => {
  await pool.query(
    `UPDATE return_requests SET estado = 'reembolsado', refund_id = ? WHERE id = ?`,
    [refundRowId, id],
  );
};
