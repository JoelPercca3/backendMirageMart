import culqi from "../config/culqi.js";
import { pool } from "../config/database.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

const VALID_REASONS = [
  "solicitud_comprador",
  "duplicado",
  "fraudulento",
  "otro",
];

// ✅ Lógica central de reembolso — reutilizada tanto por el reembolso manual
// del admin (payment.controller.refund) como por la aprobación de
// solicitudes de reembolso del cliente (refundRequest.service.approveRequest).
// Así el llamado real a Culqi vive en un solo lugar.
export const processRefund = async ({ order_id, amount, reason, adminId }) => {
  const payment = await paymentRepo.findByOrder(order_id);
  if (!payment)
    throw new AppError("No se encontró el pago de este pedido", 404);
  if (!payment.referencia_externa)
    throw new AppError(
      "Este pedido no tiene un cargo válido para reembolsar",
      400,
    );

  const montoDisponible =
    Number(payment.monto) - Number(payment.monto_reembolsado);
  if (montoDisponible <= 0)
    throw new AppError("Este pedido ya fue reembolsado en su totalidad", 400);

  const montoSoles = amount ? Number(amount) : montoDisponible;
  if (montoSoles <= 0 || montoSoles > montoDisponible) {
    throw new AppError(
      `El monto debe ser mayor a 0 y no puede superar S/ ${montoDisponible.toFixed(2)} (saldo disponible)`,
      400,
    );
  }

  const refundAmountCents = Math.round(montoSoles * 100);
  const refundReason = VALID_REASONS.includes(reason)
    ? reason
    : "solicitud_comprador";

  const { data: refundData } = await culqi.post("/refunds", {
    charge_id: payment.referencia_externa,
    amount: refundAmountCents,
    reason: refundReason,
  });

  const conn = await pool.getConnection();
  let refundResult;
  try {
    await conn.beginTransaction();

    refundResult = await paymentRepo.registerRefund(
      {
        order_id,
        payment_id: payment.id,
        charge_id: payment.referencia_externa,
        refund_id: refundData.id,
        monto: montoSoles,
        reason: refundReason,
        status: refundData.status,
        respuesta: refundData,
      },
      conn,
    );

    await orderRepo.updateStatus(
      order_id,
      refundResult.esReembolsoCompleto ? "reembolsado" : "reembolso_parcial",
      refundResult.esReembolsoCompleto
        ? "Reembolso total procesado"
        : `Reembolso parcial procesado: S/ ${montoSoles.toFixed(2)}`,
      adminId || null,
      conn,
    );

    await conn.commit();
  } catch (dbError) {
    await conn.rollback();
    throw dbError;
  } finally {
    conn.release();
  }

  return { refundData, refundResult, montoSoles };
};
