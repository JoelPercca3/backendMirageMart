import * as refundRequestRepo from "../repositories/refundRequest.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import { processRefund } from "./payment.service.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import {
  sendRefundRequestReceived,
  sendRefundRequestAdminNotification,
  sendRefundRequestApproved,
  sendRefundRequestRejected,
} from "./email.service.js";
import {
  notifyRefundRequestApproved,
  notifyRefundRequestRejected,
} from "./notification.service.js";

export const VALID_MOTIVOS = [
  "cambio_de_opinion",
  "ya_no_lo_necesito",
  "demora_envio",
  "producto_incorrecto",
  "otro",
];

export const createRequest = async (
  userId,
  { order_id, motivo, comentario },
) => {
  const order = await orderRepo.findById(order_id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (order.user_id !== userId)
    throw new AppError("No tienes permiso sobre este pedido", 403);

  if (order.estado !== "cancelado") {
    throw new AppError(
      "Solo puedes solicitar reembolso de un pedido cancelado",
      400,
    );
  }

  if (!VALID_MOTIVOS.includes(motivo)) {
    throw new AppError("Selecciona un motivo válido", 400);
  }

  const payment = await paymentRepo.findByOrder(order_id);
  if (!payment || ["pendiente", "fallido"].includes(payment.estado)) {
    throw new AppError("Este pedido no tiene un pago que reembolsar", 400);
  }

  const montoDisponible =
    Number(payment.monto) - Number(payment.monto_reembolsado);
  if (montoDisponible <= 0) {
    throw new AppError("Este pedido ya fue reembolsado en su totalidad", 400);
  }

  const existing = await refundRequestRepo.findPendingByOrder(order_id);
  if (existing) {
    throw new AppError(
      "Ya tienes una solicitud de reembolso en revisión para este pedido",
      409,
    );
  }

  const id = await refundRequestRepo.create({
    order_id,
    user_id: userId,
    motivo,
    comentario,
    monto_solicitado: montoDisponible,
  });

  sendRefundRequestReceived(
    order.cliente_email,
    order.cliente_nombre,
    order,
  ).catch((e) =>
    console.error("Error email solicitud reembolso (cliente):", e),
  );
  sendRefundRequestAdminNotification(order, motivo, comentario).catch((e) =>
    console.error("Error email solicitud reembolso (admin):", e),
  );

  return { id, monto_solicitado: montoDisponible };
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const offset = (page - 1) * limit;
  const result = await refundRequestRepo.getAll({
    limit,
    offset,
    estado: query.estado,
  });
  return {
    data: result.rows,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

export const approveRequest = async (requestId, adminId) => {
  const request = await refundRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (request.estado !== "pendiente")
    throw new AppError("Esta solicitud ya fue procesada", 400);

  const { refundData, refundResult } = await processRefund({
    order_id: request.order_id,
    amount: request.monto_solicitado,
    reason: "solicitud_comprador",
    adminId,
  });

  await refundRequestRepo.approve(requestId, {
    refund_id: refundResult.refundRowId,
    reviewed_by: adminId,
  });

  const order = await orderRepo.findById(request.order_id);
  if (order?.cliente_email) {
    sendRefundRequestApproved(
      order.cliente_email,
      order.cliente_nombre,
      order,
      request.monto_solicitado,
    ).catch((e) => console.error("Error email reembolso aprobado:", e));
  }

  // ✅ notificación in-app para el cliente
  if (order) {
    notifyRefundRequestApproved(
      request.user_id,
      request.order_id,
      order.codigo_orden,
      request.monto_solicitado,
    ).catch((e) => console.error("Error notificación reembolso aprobado:", e));
  }

  return { refund_id: refundData.id };
};

export const rejectRequest = async (requestId, adminId, respuesta_admin) => {
  const request = await refundRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (request.estado !== "pendiente")
    throw new AppError("Esta solicitud ya fue procesada", 400);

  await refundRequestRepo.reject(requestId, {
    respuesta_admin,
    reviewed_by: adminId,
  });

  const order = await orderRepo.findById(request.order_id);
  if (order?.cliente_email) {
    sendRefundRequestRejected(
      order.cliente_email,
      order.cliente_nombre,
      order,
      respuesta_admin,
    ).catch((e) => console.error("Error email reembolso rechazado:", e));
  }

  // ✅ notificación in-app para el cliente
  if (order) {
    notifyRefundRequestRejected(
      request.user_id,
      request.order_id,
      order.codigo_orden,
    ).catch((e) => console.error("Error notificación reembolso rechazado:", e));
  }
};
