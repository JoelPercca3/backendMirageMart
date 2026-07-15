import * as returnRequestRepo from "../repositories/returnRequest.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import { processRefund } from "./payment.service.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import {
  sendReturnRequestReceived,
  sendReturnRequestAdminNotification,
  sendReturnRequestApproved,
  sendReturnRequestRejected,
  sendReturnRefundConfirmed,
} from "./email.service.js";
import {
  notifyReturnRequestApproved,
  notifyReturnRequestRejected,
  notifyReturnRefunded,
} from "./notification.service.js";

const RETURN_WINDOW_DAYS = 7;

export const VALID_MOTIVOS = [
  "producto_defectuoso",
  "talla_incorrecta",
  "producto_equivocado",
  "no_es_lo_que_esperaba",
  "otro",
];

export const createRequest = async (
  userId,
  { order_id, order_item_id, motivo, comentario, cantidad, fotos },
) => {
  if (!VALID_MOTIVOS.includes(motivo))
    throw new AppError("Selecciona un motivo válido", 400);
  if (!fotos?.length)
    throw new AppError("Debes adjuntar al menos una foto como evidencia", 400);

  const order = await orderRepo.findById(order_id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (order.user_id !== userId)
    throw new AppError("No tienes permiso sobre este pedido", 403);
  if (order.estado !== "entregado") {
    throw new AppError(
      "Solo puedes solicitar devolución de un pedido entregado",
      400,
    );
  }

  const fechaEntrega = await orderRepo.getFechaEntrega(order_id);
  if (!fechaEntrega)
    throw new AppError("No se pudo verificar la fecha de entrega", 400);

  const diasTranscurridos =
    (Date.now() - new Date(fechaEntrega).getTime()) / (1000 * 60 * 60 * 24);
  if (diasTranscurridos > RETURN_WINDOW_DAYS) {
    throw new AppError(
      `El plazo para solicitar devoluciones es de ${RETURN_WINDOW_DAYS} días desde la entrega`,
      400,
    );
  }

  const item = order.items?.find((i) => i.id === Number(order_item_id));
  if (!item) throw new AppError("El producto no pertenece a este pedido", 400);

  const existing = await returnRequestRepo.findActiveByOrderItem(order_item_id);
  if (existing) {
    throw new AppError(
      "Ya existe una solicitud de devolución activa para este producto",
      409,
    );
  }

  const cantidadFinal = Math.min(
    Number(cantidad) || item.cantidad,
    item.cantidad,
  );
  const montoReembolso = Number(item.precio_unitario) * cantidadFinal;

  const id = await returnRequestRepo.create({
    order_id,
    order_item_id,
    user_id: userId,
    motivo,
    comentario,
    cantidad: cantidadFinal,
    fotos,
    monto_reembolso: montoReembolso,
  });

  sendReturnRequestReceived(
    order.cliente_email,
    order.cliente_nombre,
    order,
    item,
  ).catch((e) => console.error("Error email devolución (cliente):", e));
  sendReturnRequestAdminNotification(order, item, motivo, comentario).catch(
    (e) => console.error("Error email devolución (admin):", e),
  );

  return { id, monto_reembolso: montoReembolso };
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const offset = (page - 1) * limit;
  const result = await returnRequestRepo.getAll({
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

export const approveRequest = async (
  requestId,
  adminId,
  instrucciones_admin,
) => {
  const request = await returnRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (request.estado !== "pendiente")
    throw new AppError("Esta solicitud ya fue procesada", 400);

  await returnRequestRepo.approve(requestId, {
    instrucciones_admin,
    reviewed_by: adminId,
  });

  const order = await orderRepo.findById(request.order_id);
  if (order?.cliente_email) {
    sendReturnRequestApproved(
      order.cliente_email,
      order.cliente_nombre,
      order,
      instrucciones_admin,
    ).catch((e) => console.error("Error email devolución aprobada:", e));
  }

  // ✅ notificación in-app para el cliente
  if (order) {
    notifyReturnRequestApproved(
      request.user_id,
      request.order_id,
      order.codigo_orden,
    ).catch((e) => console.error("Error notificación devolución aprobada:", e));
  }
};

export const rejectRequest = async (requestId, adminId, respuesta_admin) => {
  const request = await returnRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (!["pendiente", "aprobado", "recibido"].includes(request.estado)) {
    throw new AppError("Esta solicitud ya fue procesada", 400);
  }

  await returnRequestRepo.reject(requestId, {
    respuesta_admin,
    reviewed_by: adminId,
  });

  const order = await orderRepo.findById(request.order_id);
  if (order?.cliente_email) {
    sendReturnRequestRejected(
      order.cliente_email,
      order.cliente_nombre,
      order,
      respuesta_admin,
    ).catch((e) => console.error("Error email devolución rechazada:", e));
  }

  // ✅ notificación in-app para el cliente
  if (order) {
    notifyReturnRequestRejected(
      request.user_id,
      request.order_id,
      order.codigo_orden,
    ).catch((e) =>
      console.error("Error notificación devolución rechazada:", e),
    );
  }
};

// El admin marca que el producto físico ya llegó de vuelta
export const markReceived = async (requestId, adminId) => {
  const request = await returnRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (request.estado !== "aprobado") {
    throw new AppError(
      "La solicitud debe estar aprobada antes de marcarla como recibida",
      400,
    );
  }
  await returnRequestRepo.markReceived(requestId, adminId);
};

// El admin confirma que el producto está en condiciones y dispara el reembolso real
export const confirmAndRefund = async (requestId, adminId) => {
  const request = await returnRequestRepo.findById(requestId);
  if (!request) throw new AppError("Solicitud no encontrada", 404);
  if (request.estado !== "recibido") {
    throw new AppError("Primero debes marcar la solicitud como recibida", 400);
  }

  const { refundData, refundResult } = await processRefund({
    order_id: request.order_id,
    amount: request.monto_reembolso,
    reason: "solicitud_comprador",
    adminId,
  });

  await returnRequestRepo.markRefunded(requestId, refundResult.refundRowId);

  const order = await orderRepo.findById(request.order_id);
  if (order?.cliente_email) {
    sendReturnRefundConfirmed(
      order.cliente_email,
      order.cliente_nombre,
      order,
      request.monto_reembolso,
    ).catch((e) => console.error("Error email devolución reembolsada:", e));
  }

  // ✅ notificación in-app para el cliente
  if (order) {
    notifyReturnRefunded(
      request.user_id,
      request.order_id,
      order.codigo_orden,
      request.monto_reembolso,
    ).catch((e) =>
      console.error("Error notificación devolución reembolsada:", e),
    );
  }

  return { refund_id: refundData.id };
};
