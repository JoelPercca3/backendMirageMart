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

// Usado para el pago inicial (éxito/fallo del cargo) — NO para reembolsos
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

// ✅ Fuente única de verdad: monto_reembolsado se calcula en tiempo real
// con SUM(refunds.monto), no se confía en la columna caché de payments.
export const findByOrder = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT p.*,
            COALESCE((
              SELECT SUM(monto) FROM refunds WHERE payment_id = p.id
            ), 0) AS monto_reembolsado
     FROM payments p
     WHERE p.order_id = ?
     LIMIT 1`,
    [orderId],
  );
  return rows[0] || null;
};

// ✅ Registra un reembolso (parcial o total) en "refunds" (historial completo,
// fuente única de verdad) y refresca el caché en "payments.monto_reembolsado"
// solo para lectura rápida en otras queries — nunca se usa como decisión.
export const registerRefund = async (
  {
    order_id,
    payment_id,
    charge_id,
    refund_id,
    monto,
    reason,
    status,
    respuesta,
  },
  conn = pool,
) => {
  // ✅ CAPTURAR el resultado del INSERT
  const [insertResult] = await conn.query(
    `INSERT INTO refunds
      (order_id, payment_id, charge_id, refund_id, monto, reason, status, respuesta_pasarela, fecha_reembolso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      order_id,
      payment_id,
      charge_id,
      refund_id,
      monto,
      reason,
      status || null,
      respuesta ? JSON.stringify(respuesta) : null,
    ],
  );

  const refundRowId = insertResult.insertId; // ✅ Ahora insertResult está definido

  const [[current]] = await conn.query(
    `SELECT monto FROM payments WHERE id = ? FOR UPDATE`,
    [payment_id],
  );

  const [[{ total_reembolsado }]] = await conn.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_reembolsado FROM refunds WHERE payment_id = ?`,
    [payment_id],
  );

  const nuevoAcumulado = Number(total_reembolsado);
  const esReembolsoCompleto = nuevoAcumulado >= Number(current.monto);

  await conn.query(
    `UPDATE payments
     SET monto_reembolsado = ?,
         estado = ?
     WHERE id = ?`,
    [
      nuevoAcumulado,
      esReembolsoCompleto ? "reembolsado" : "completado",
      payment_id,
    ],
  );

  return { nuevoAcumulado, esReembolsoCompleto, refundRowId }; // ✅ agregado refundRowId
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
