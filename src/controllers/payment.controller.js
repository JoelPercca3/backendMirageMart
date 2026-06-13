import culqi from "../config/culqi.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import { pool } from "../config/database.js";
import { success, created, paginated, error } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

// ── Crear cargo con Culqi ─────────────────────────────────
export const createCharge = async (req, res, next) => {
  try {
    const { order_id, token_id, email } = req.body;

    console.log("=== INICIO createCharge ===");
    console.log("req.user:", req.user);
    console.log("order_id:", order_id);
    console.log("token_id:", token_id);
    console.log("email:", email);

    // Buscar orden
    const order = await orderRepo.findById(order_id);

    console.log("Orden encontrada:", order);

    if (!order) {
      throw new AppError("Pedido no encontrado", 404);
    }

    console.log("Estado de la orden:", order.estado);

    // Validar estado
    if (order.estado !== "pendiente") {
      console.log("❌ Estado no válido:", order.estado);

      throw new AppError("Este pedido ya fue procesado", 400);
    }

    // Monto en céntimos
    const amount = Math.round(Number(order.total) * 100);

    console.log("Monto a cobrar:", amount, "céntimos (S/", order.total, ")");

    // Datos enviados a Culqi
    const culqiData = {
      amount,
      currency_code: "PEN",
      email,
      source_id: token_id,
      description: `Pedido #${order.codigo_orden} — MirageMart`,
      metadata: {
        order_id: String(order_id),
        codigo_orden: order.codigo_orden,
      },
    };

    console.log("📤 Enviando a Culqi:");
    console.log(JSON.stringify(culqiData, null, 2));

    // Crear cargo
    const charge = await culqi.post("/charges", culqiData);

    console.log(
      "📥 Respuesta completa de Culqi:",
      JSON.stringify(charge.data, null, 2),
    );

    const chargeData = charge.data;

    // ── VALIDAR SI EL PAGO FUE EXITOSO ─────────────────────
    if (
      chargeData.object === "charge" &&
      chargeData.outcome?.type === "venta_exitosa"
    ) {
      console.log("✅ Pago exitoso en Culqi");

      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        // Guardar pago
        await paymentRepo.create(
          {
            order_id,
            metodo: "tarjeta",
            monto: order.total,
            pasarela: "culqi",
          },
          conn,
        );

        // Actualizar estado pago
        await paymentRepo.updateStatus(
          order_id,
          "completado",
          chargeData.id,
          chargeData,
          conn,
        );

        // Actualizar estado orden
        await orderRepo.updateStatus(
          order_id,
          "pagado",
          "Pago completado con Culqi",
          null,
          conn,
        );

        await conn.commit();

        console.log("✅ Transacción completada correctamente");
      } catch (dbError) {
        await conn.rollback();

        console.error("❌ Error en transacción BD:");
        console.error(dbError);

        throw dbError;
      } finally {
        conn.release();
      }

      return success(
        res,
        {
          charge_id: chargeData.id,
          order_id,
          total: order.total,
          codigo_orden: order.codigo_orden,
          estado: "pagado",
        },
        "Pago completado exitosamente",
      );
    }

    // ── SI EL PAGO FALLÓ ───────────────────────────────────
    console.log("❌ Cargo NO exitoso");
    console.log("Respuesta:", JSON.stringify(chargeData, null, 2));

    throw new AppError(
      chargeData.outcome?.merchant_message ||
        chargeData.user_message ||
        chargeData.merchant_message ||
        "El pago no pudo ser procesado",
      400,
    );
  } catch (err) {
    console.log("=== ERROR EN createCharge ===");

    console.error(err);

    // ── ERRORES DE CULQI ───────────────────────────────────
    if (err.response?.data || err.merchant_message || err.user_message) {
      const culqiError = err.response?.data || err;

      console.log("❌ Error Culqi:");
      console.log(JSON.stringify(culqiError, null, 2));

      return error(
        res,
        culqiError.outcome?.merchant_message ||
          culqiError.user_message ||
          culqiError.merchant_message ||
          "Error al procesar el pago",
        400,
      );
    }

    next(err);
  }
};

// ── Webhook de Culqi ──────────────────────────────────────
export const webhook = async (req, res) => {
  try {
    const event = req.body;

    console.log("[Culqi Webhook COMPLETO]", JSON.stringify(event, null, 2));

    // Compatibilidad con distintos eventos de Culqi
    if (
      event.type === "charge.succeeded" ||
      event.type === "charge.creation.succeeded"
    ) {
      // Algunas versiones de Culqi envían la info en data.object
      const chargeData =
        typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data?.object || event.data;
      console.log("ChargeData:", chargeData);

      const orderId = chargeData?.metadata?.order_id;

      console.log("Order ID recibido:", orderId);

      if (orderId) {
        // Actualizar orden
        await orderRepo.updateStatus(
          orderId,
          "pagado",
          "Pago confirmado por webhook",
        );

        // Actualizar pago
        await paymentRepo.updateStatus(
          orderId,
          "completado",
          chargeData.id,
          chargeData,
        );

        console.log("✅ Orden actualizada por webhook");
      } else {
        console.log("⚠️ No se encontró order_id en metadata");
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook Error]", err);

    res.status(200).json({ received: true });
  }
};
// ── Obtener pago por orden ────────────────────────────────
export const getByOrder = async (req, res, next) => {
  try {
    const payment = await paymentRepo.findByOrder(req.params.orderId);

    success(res, payment);
  } catch (err) {
    next(err);
  }
};

// ── Reembolso ─────────────────────────────────────────────
export const refund = async (req, res, next) => {
  try {
    const { charge_id, order_id } = req.body;

    await culqi.refunds.createRefund({
      amount: req.body.amount,
      charge_id,
      reason: "solicitud_comprador",
    });

    await paymentRepo.updateStatus(order_id, "reembolsado", charge_id, null);

    await orderRepo.updateStatus(
      order_id,
      "reembolsado",
      "Reembolso procesado",
      req.user.id,
    );

    success(res, null, "Reembolso procesado");
  } catch (err) {
    next(err);
  }
};

// ── Listar pagos ──────────────────────────────────────────
export const paymentGetAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    paginated(res, {
      ...(await paymentRepo.getAll({ limit, offset })),
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

// ── Crear intención de pago ───────────────────────────────
export const createIntent = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    const order = await orderRepo.findById(order_id);

    if (!order) {
      throw new AppError("Pedido no encontrado", 404);
    }

    success(res, {
      order_id,
      total: order.total,
      moneda: "PEN",
      codigo_orden: order.codigo_orden,
    });
  } catch (err) {
    next(err);
  }
};

// ── Confirmar pago manualmente ────────────────────────────
export const confirm = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await paymentRepo.updateStatus(
        orderId,
        "completado",
        req.body.referencia,
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
  } catch (err) {
    next(err);
  }
};
