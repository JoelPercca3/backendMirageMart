// src/services/notification.service.js
import { pool } from "../config/database.js";

/**
 * Crea una notificación para un usuario
 * @param {number} userId
 * @param {string} titulo
 * @param {string} mensaje
 * @param {string} tipo - "pedido" | "promo" | "sistema"
 * @param {string} url_accion - ruta a donde lleva al hacer clic
 */
export const createNotification = async (
  userId,
  titulo,
  mensaje,
  tipo = "sistema",
  url_accion = null,
) => {
  try {
    await pool.query(
      "INSERT INTO notifications (user_id, titulo, mensaje, tipo, url_accion) VALUES (?, ?, ?, ?, ?)",
      [userId, titulo, mensaje, tipo, url_accion],
    );
  } catch (err) {
    console.error("❌ Error al crear notificación:", err.message);
  }
};

// ─── Notificaciones predefinidas por evento ───────────────────────────────────

export const notifyOrderCreated = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "✅ Pedido recibido",
    `Tu pedido #${codigoOrden} fue recibido y está siendo procesado.`,
    "pedido",
    `/orders/${orderId}`,
  );

export const notifyOrderPaid = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "💳 Pago confirmado",
    `El pago de tu pedido #${codigoOrden} fue confirmado exitosamente.`,
    "pedido",
    `/orders/${orderId}`,
  );

export const notifyOrderShipped = (userId, orderId, codigoOrden, tracking) =>
  createNotification(
    userId,
    "🚚 Pedido en camino",
    `Tu pedido #${codigoOrden} fue enviado${tracking ? `. Tracking: ${tracking}` : ""}.`,
    "pedido",
    `/orders/${orderId}`,
  );

export const notifyOrderDelivered = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "🎉 Pedido entregado",
    `Tu pedido #${codigoOrden} fue entregado. ¡Esperamos que lo disfrutes!`,
    "pedido",
    `/orders/${orderId}`,
  );

export const notifyOrderCancelled = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "❌ Pedido cancelado",
    `Tu pedido #${codigoOrden} fue cancelado.`,
    "pedido",
    `/orders/${orderId}`,
  );

export const notifyOrderPreparing = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "📦 En preparación",
    `Tu pedido #${codigoOrden} está siendo preparado.`,
    "pedido",
    `/orders/${orderId}`,
  );
