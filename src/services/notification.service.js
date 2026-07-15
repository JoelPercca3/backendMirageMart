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

// ─── Notificaciones de reembolsos y devoluciones ──────────────────────────────

export const notifyRefundRequestApproved = (
  userId,
  orderId,
  codigoOrden,
  monto,
) =>
  createNotification(
    userId,
    "✅ Reembolso aprobado",
    `Tu solicitud de reembolso del pedido #${codigoOrden} fue aprobada. Se procesó S/ ${Number(monto).toFixed(2)}.`,
    "reembolso",
    `/orders/${orderId}`,
  );

export const notifyRefundRequestRejected = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "Solicitud de reembolso rechazada",
    `Tu solicitud de reembolso del pedido #${codigoOrden} no pudo ser aprobada. Revisa los detalles.`,
    "reembolso",
    `/orders/${orderId}`,
  );

export const notifyReturnRequestApproved = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "📦 Devolución aprobada",
    `Tu solicitud de devolución del pedido #${codigoOrden} fue aprobada. Revisa las instrucciones de envío.`,
    "reembolso",
    `/orders/${orderId}`,
  );

export const notifyReturnRequestRejected = (userId, orderId, codigoOrden) =>
  createNotification(
    userId,
    "Solicitud de devolución rechazada",
    `Tu solicitud de devolución del pedido #${codigoOrden} no pudo ser aprobada. Revisa los detalles.`,
    "reembolso",
    `/orders/${orderId}`,
  );

export const notifyReturnRefunded = (userId, orderId, codigoOrden, monto) =>
  createNotification(
    userId,
    "🎉 Devolución completada",
    `Recibimos tu producto del pedido #${codigoOrden} y procesamos tu reembolso de S/ ${Number(monto).toFixed(2)}.`,
    "reembolso",
    `/orders/${orderId}`,
  );

export const notifyAdminRefund = (
  userId,
  orderId,
  codigoOrden,
  monto,
  esCompleto,
) =>
  createNotification(
    userId,
    esCompleto
      ? "✅ Reembolso total procesado"
      : "💰 Reembolso parcial procesado",
    `Se procesó un reembolso de S/ ${Number(monto).toFixed(2)} para tu pedido #${codigoOrden}.`,
    "reembolso",
    `/orders/${orderId}`,
  );
