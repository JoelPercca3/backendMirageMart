import culqi from "../config/culqi.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import { pool } from "../config/database.js";
import { success, created, paginated, error } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import {
  formatDateTime,
  formatDate,
  formatTime,
  parseCreationDate,
} from "../utils/dateFormatter.js";
import { processRefund } from "../services/payment.service.js";
import { notifyAdminRefund } from "../services/notification.service.js"; // ✅ nuevo import

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

    console.log("[Culqi Webhook] Evento recibido:", event.type);

    if (
      event.type === "charge.succeeded" ||
      event.type === "charge.creation.succeeded"
    ) {
      const chargeDataRaw =
        typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data?.object || event.data;

      const chargeId = chargeDataRaw?.id;

      if (!chargeId) {
        console.log("⚠️ Webhook sin charge id — ignorado");
        return res.status(200).json({ received: true });
      }

      // ── ⚠️ NO CONFIAR EN EL PAYLOAD DEL WEBHOOK ────────────
      // Culqi no firma sus webhooks (sin HMAC ni secreto verificable),
      // así que cualquiera podría enviar un POST falso a esta URL.
      // Por eso, en vez de creer el body, le preguntamos directamente
      // a la API de Culqi si este cargo existe y fue realmente exitoso.
      let chargeData;
      try {
        const verifiedCharge = await culqi.get(`/charges/${chargeId}`);
        chargeData = verifiedCharge.data;
      } catch (verifyErr) {
        console.error(
          "❌ No se pudo verificar el cargo contra la API de Culqi:",
          verifyErr.response?.data || verifyErr.message,
        );
        // Respondemos 200 igual (Culqi no debe reintentar indefinidamente
        // por un cargo que no pudimos verificar), pero NO actualizamos nada.
        return res.status(200).json({ received: true });
      }

      const orderId = chargeData?.metadata?.order_id;

      if (!orderId) {
        console.log("⚠️ No se encontró order_id en metadata verificada");
        return res.status(200).json({ received: true });
      }

      if (chargeData.outcome?.type !== "venta_exitosa") {
        console.log(
          `⚠️ Cargo ${chargeId} verificado pero NO exitoso (${chargeData.outcome?.type}) — no se actualiza el pedido`,
        );
        return res.status(200).json({ received: true });
      }

      // ── Idempotencia: si el pedido ya está pagado, no lo procesamos de nuevo ──
      const order = await orderRepo.findById(orderId);
      if (!order) {
        console.log(`⚠️ Pedido ${orderId} no encontrado — webhook ignorado`);
        return res.status(200).json({ received: true });
      }
      if (order.estado !== "pendiente") {
        console.log(
          `ℹ️ Pedido ${orderId} ya estaba en estado "${order.estado}" — webhook ignorado (evita doble procesamiento)`,
        );
        return res.status(200).json({ received: true });
      }

      await orderRepo.updateStatus(
        orderId,
        "pagado",
        "Pago confirmado por webhook (verificado contra API de Culqi)",
      );

      await paymentRepo.updateStatus(
        orderId,
        "completado",
        chargeData.id,
        chargeData,
      );

      console.log(`✅ Orden ${orderId} actualizada por webhook (verificado)`);
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
    if (!payment) return success(res, null);
    success(res, payment);
  } catch (err) {
    next(err);
  }
};

// ── Reembolso (manual, iniciado por el admin) ─────────────
export const refund = async (req, res, next) => {
  try {
    const { order_id, amount, reason } = req.body;
    if (!order_id) throw new AppError("Falta el order_id", 400);

    const order = await orderRepo.findById(order_id);
    if (!order) throw new AppError("Pedido no encontrado", 404);

    const { refundData, refundResult, montoSoles } = await processRefund({
      order_id,
      amount,
      reason,
      adminId: req.user.id,
    });

    // ✅ notificación in-app para el cliente
    notifyAdminRefund(
      order.user_id,
      order_id,
      order.codigo_orden,
      montoSoles,
      refundResult.esReembolsoCompleto,
    ).catch((e) => console.error("Error notificación reembolso admin:", e));

    success(
      res,
      {
        refund_id: refundData.id,
        amount: montoSoles,
        reason: refundData.reason,
        status: refundData.status,
        es_reembolso_completo: refundResult.esReembolsoCompleto,
        monto_reembolsado_acumulado: refundResult.nuevoAcumulado,
      },
      refundResult.esReembolsoCompleto
        ? "Reembolso total procesado exitosamente"
        : "Reembolso parcial procesado exitosamente",
    );
  } catch (err) {
    if (err.response?.data) {
      console.error(
        "❌ Error Culqi (reembolso):",
        JSON.stringify(err.response.data, null, 2),
      );
      return error(
        res,
        err.response.data.user_message ||
          err.response.data.merchant_message ||
          "No se pudo procesar el reembolso",
        400,
      );
    }
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
