// payment.controller.js
import * as paymentRepo from "../repositories/payment.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import { pool } from "../config/database.js";
import { success, created, paginated } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const createIntent = async (req, res, next) => {
  try {
    const { order_id, metodo } = req.body;
    const order = await orderRepo.findById(order_id);
    if (!order) throw new AppError("Pedido no encontrado", 404);
    if (order.user_id !== req.user.id) throw new AppError("No autorizado", 403);
    if (order.estado !== "pendiente")
      throw new AppError("Este pedido ya fue procesado", 400);
    const payId = await paymentRepo.create({
      order_id,
      metodo,
      monto: order.total,
      pasarela: "manual",
    });
    success(res, { payment_id: payId, total: order.total, moneda: "PEN" });
  } catch (e) {
    next(e);
  }
};
export const confirm = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { referencia } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await paymentRepo.updateStatus(
        orderId,
        "completado",
        referencia,
        null,
        conn,
      );
      await orderRepo.updateStatus(
        orderId,
        "pagado",
        "Pago confirmado",
        null,
        conn,
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    success(res, null, "Pago confirmado exitosamente");
  } catch (e) {
    next(e);
  }
};
export const webhook = (req, res) => {
  console.log("[Webhook]", req.body);
  res.status(200).json({ received: true });
};
export const getByOrder = async (req, res, next) => {
  try {
    success(res, await paymentRepo.findByOrder(req.params.orderId));
  } catch (e) {
    next(e);
  }
};
export const refund = async (req, res, next) => {
  try {
    await paymentRepo.updateStatus(
      req.body.order_id,
      "reembolsado",
      req.params.paymentId,
      null,
    );
    await orderRepo.updateStatus(
      req.body.order_id,
      "reembolsado",
      "Reembolso procesado",
      req.user.id,
    );
    success(res, null, "Reembolso procesado");
  } catch (e) {
    next(e);
  }
};
export const paymentGetAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    paginated(res, {
      ...(await paymentRepo.getAll({ limit, offset })),
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
};
