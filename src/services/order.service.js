// src/services/order.service.js
import { pool } from "../config/database.js";
import * as cartRepo from "../repositories/cart.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import * as productRepo from "../repositories/product.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { generateOrderCode } from "../utils/generateCode.js";
import { getPagination } from "../utils/paginate.js";
import {
  sendOrderConfirmation,
  sendOrderStatus,
} from "../services/email.service.js";
import { generateComprobantePDF } from "../services/comprobante.service.js";
import {
  notifyOrderCreated,
  notifyOrderCancelled,
  notifyOrderPaid,
  notifyOrderPreparing,
  notifyOrderShipped,
  notifyOrderDelivered,
} from "../services/notification.service.js";

export const create = async (
  userId,
  { address_id, shipping_method_id, coupon_code, notas_cliente },
  ip,
) => {
  address_id = Number(address_id);
  shipping_method_id = Number(shipping_method_id);

  if (isNaN(address_id)) address_id = 0;
  if (isNaN(shipping_method_id)) shipping_method_id = 0;

  const cartItems = await cartRepo.getByUser(userId);
  if (!cartItems.length) throw new AppError("El carrito está vacío", 400);

  const [shippingRows] = await pool.query(
    "SELECT * FROM shipping_methods WHERE id = ? AND activo = 1",
    [shipping_method_id],
  );
  const shippingRow = shippingRows[0];
  if (!shippingRow) throw new AppError("Método de envío inválido", 400);

  const subtotal = cartItems.reduce((acc, item) => {
    const precioUnitario = Number(item.precio_unitario) || 0;
    const precioExtra = Number(item.precio_extra) || 0;
    const cantidad = Number(item.cantidad) || 0;
    return acc + (precioUnitario + precioExtra) * cantidad;
  }, 0);

  if (isNaN(subtotal)) throw new AppError("Error al calcular el subtotal", 400);

  const costo_envio = Number(shippingRow.precio) || 0;

  let descuento = 0;
  let coupon_id = null;

  if (coupon_code) {
    const [[coupon]] = await pool.query(
      `SELECT * FROM coupons WHERE codigo = ? AND activo = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (uso_maximo IS NULL OR uso_actual < uso_maximo)`,
      [coupon_code],
    );

    if (!coupon) throw new AppError("Cupón inválido o expirado", 400);

    if (subtotal < coupon.minimo_compra)
      throw new AppError(
        `Monto mínimo para este cupón: S/ ${coupon.minimo_compra}`,
        400,
      );

    coupon_id = coupon.id;

    if (coupon.tipo_descuento === "porcentaje") {
      descuento = (subtotal * Number(coupon.valor)) / 100;
      if (coupon.maximo_descuento)
        descuento = Math.min(descuento, Number(coupon.maximo_descuento));
    } else if (coupon.tipo_descuento === "monto_fijo") {
      descuento = Math.min(Number(coupon.valor), subtotal);
    } else if (coupon.tipo_descuento === "envio_gratis") {
      descuento = costo_envio;
    }
  }

  const finalCostoEnvio =
    coupon_id && descuento === costo_envio ? 0 : costo_envio;

  let total = subtotal - descuento + finalCostoEnvio;
  total = Math.round(total * 100) / 100;

  if (isNaN(total)) throw new AppError("Error al calcular el total", 400);

  const codigo_orden = generateOrderCode();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    for (const item of cartItems) {
      let stockOk;
      if (item.variant_id) {
        const [r] = await conn.query(
          "UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [item.cantidad, item.variant_id, item.cantidad],
        );
        stockOk = r.affectedRows > 0;
      } else {
        stockOk = await productRepo.updateStock(
          item.product_id,
          item.cantidad,
          conn,
        );
      }
      if (!stockOk) {
        await conn.rollback();
        throw new AppError(`Stock insuficiente: ${item.nombre}`, 400);
      }
    }

    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      nombre: item.nombre,
      sku: item.sku_item || item.sku,
      opciones: item.variante_opciones,
      precio_unitario:
        Number(item.precio_unitario) + Number(item.precio_extra || 0),
      cantidad: item.cantidad,
      subtotal:
        (Number(item.precio_unitario) + Number(item.precio_extra || 0)) *
        item.cantidad,
      imagen: item.imagen,
    }));

    const orderId = await orderRepo.create(
      {
        user_id: userId,
        address_id,
        shipping_method_id,
        coupon_id,
        codigo_orden,
        subtotal,
        descuento,
        costo_envio: finalCostoEnvio,
        total,
        notas_cliente,
        ip_cliente: ip,
      },
      orderItems,
      conn,
    );

    if (coupon_id) {
      await conn.query(
        "UPDATE coupons SET uso_actual = uso_actual + 1 WHERE id = ?",
        [coupon_id],
      );
    }

    for (const item of cartItems) {
      await conn.query(
        "UPDATE products SET ventas_count = ventas_count + ? WHERE id = ?",
        [item.cantidad, item.product_id],
      );
    }

    await cartRepo.clearCart(userId, conn);
    await conn.commit();
    conn.release();

    // ✅ Obtener orden completa con email y nombre del cliente
    const order = await orderRepo.findById(orderId, userId);

    // ✅ Generar el comprobante de pedido en PDF (no bloquea la respuesta
    //    si algo falla — el pedido ya se creó correctamente)
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateComprobantePDF(order);
    } catch (err) {
      console.error("Error al generar comprobante PDF:", err);
    }

    // ✅ Enviar email de confirmación con el comprobante adjunto
    if (order?.cliente_email && order?.cliente_nombre) {
      await sendOrderConfirmation(
        order.cliente_email,
        order.cliente_nombre,
        order,
        pdfBuffer,
      ).catch((err) =>
        console.error("Error al enviar email de confirmación:", err),
      );
    }

    return order;
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
};

export const myOrders = async (userId, query) => {
  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await orderRepo.findByUser(userId, { limit, offset });
  return { data: rows, total, page, limit };
};

export const getOne = async (id, userId, rol) => {
  const order = await orderRepo.findById(id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (rol !== "admin" && order.user_id !== userId)
    throw new AppError("No tienes permiso para ver este pedido", 403);
  return order;
};

// ✅ Genera el PDF del comprobante bajo demanda, reusando el mismo
// control de permisos que getOne (dueño del pedido o admin).
export const getComprobante = async (id, userId, rol) => {
  const order = await getOne(id, userId, rol);
  const buffer = await generateComprobantePDF(order);
  return { buffer, filename: `comprobante-${order.codigo_orden}.pdf` };
};

export const cancel = async (id, userId) => {
  const order = await orderRepo.findById(id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (order.user_id !== userId) throw new AppError("No autorizado", 403);
  if (!["pendiente", "pagado"].includes(order.estado))
    throw new AppError("Este pedido ya no puede cancelarse", 400);
  const eraPagado = order.estado === "pagado"; // ← guardamos esto antes de cambiar el estado

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await orderRepo.updateStatus(
      id,
      "cancelado",
      "Cancelado por el cliente",
      userId,
      conn,
    );
    for (const item of order.items) {
      await conn.query(
        "UPDATE products SET stock_total = stock_total + ? WHERE id = ?",
        [item.cantidad, item.product_id],
      );
      if (item.variant_id)
        await conn.query(
          "UPDATE product_variants SET stock = stock + ? WHERE id = ?",
          [item.cantidad, item.variant_id],
        );
    }
    await conn.commit();

    // ✅ Email de cancelación usando sendOrderStatus
    if (order.cliente_email && order.cliente_nombre) {
      await sendOrderStatus(
        order.cliente_email,
        order.cliente_nombre,
        order,
        "cancelado",
        "Cancelado por el cliente",
      ).catch((err) =>
        console.error("Error al enviar email de cancelación:", err),
      );
    }
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const offset = (page - 1) * limit;

  const result = await orderRepo.getAll({
    limit,
    offset,
    estado: query.estado,
    search: query.search,
  });

  return {
    data: result.rows,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

// ✅ updateStatus con email automático usando sendOrderStatus
export const updateStatus = async (id, estado, comentario, adminId) => {
  const order = await orderRepo.findById(id);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  await orderRepo.updateStatus(id, estado, comentario, adminId);

  // Email
  if (order.cliente_email && order.cliente_nombre) {
    sendOrderStatus(
      order.cliente_email,
      order.cliente_nombre,
      order,
      estado,
      comentario,
    ).catch((err) => console.error("Error email estado:", err.message));
  }

  // ✅ Notificación

  const notifyMap = {
    pagado: () => notifyOrderPaid(order.user_id, id, order.codigo_orden),
    preparando: () =>
      notifyOrderPreparing(order.user_id, id, order.codigo_orden),
    enviado: () =>
      notifyOrderShipped(
        order.user_id,
        id,
        order.codigo_orden,
        order.tracking_number,
      ),
    entregado: () =>
      notifyOrderDelivered(order.user_id, id, order.codigo_orden),
    cancelado: () =>
      notifyOrderCancelled(order.user_id, id, order.codigo_orden),
  };

  const fn = notifyMap[estado];
  if (fn) await fn();
};

export const updateTracking = async (
  id,
  tracking_number,
  courier,
  clave_recojo,
) => {
  await orderRepo.updateTracking(id, tracking_number, courier, clave_recojo);
  await updateStatus(
    id,
    "enviado",
    clave_recojo
      ? `Enviado por ${courier} — Guía: ${tracking_number} — Clave de recojo: ${clave_recojo}`
      : `Enviado por ${courier} — Guía: ${tracking_number}`,
  );
};

// ✅ Cliente confirma manualmente que recibió su pedido
export const confirmDelivery = async (orderId, userId) => {
  const order = await orderRepo.findById(orderId, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (order.user_id !== userId)
    throw new AppError("No tienes permiso sobre este pedido", 403);

  if (order.estado !== "enviado") {
    throw new AppError(
      "Solo puedes confirmar la recepción de un pedido en camino",
      400,
    );
  }

  await orderRepo.updateStatus(
    orderId,
    "entregado",
    "Entrega confirmada por el cliente",
    null,
    undefined, // conn por defecto = pool
  );

  const updatedOrder = await orderRepo.findById(orderId, userId);
  if (updatedOrder?.cliente_email) {
    sendOrderStatus(
      updatedOrder.cliente_email,
      updatedOrder.cliente_nombre,
      updatedOrder,
      "entregado",
      "Confirmado por ti",
    ).catch((err) => console.error("Error email confirmación entrega:", err));
  }
  await notifyOrderDelivered(userId, orderId, order.codigo_orden);

  return { estado: "entregado" };
};

// ✅ Auto-confirma entregas de pedidos enviados hace más de N días (usado por el cron)
export const autoConfirmDeliveries = async (days = 5) => {
  const candidates = await orderRepo.findShippedOlderThan(days);

  for (const order of candidates) {
    try {
      await orderRepo.updateStatus(
        order.id,
        "entregado",
        `Entrega auto-confirmada tras ${days} días sin confirmación del cliente`,
        null,
      );

      const fullOrder = await orderRepo.findById(order.id, order.user_id);
      if (fullOrder?.cliente_email) {
        sendOrderStatus(
          fullOrder.cliente_email,
          fullOrder.cliente_nombre,
          fullOrder,
          "entregado",
          "Confirmación automática",
        ).catch((err) => console.error("Error email auto-confirmación:", err));
      }
      await notifyOrderDelivered(order.user_id, order.id, order.codigo_orden);

      console.log(
        `✅ Pedido #${order.codigo_orden} auto-confirmado como entregado`,
      );
    } catch (err) {
      console.error(
        `❌ Error auto-confirmando pedido #${order.codigo_orden}:`,
        err,
      );
    }
  }

  return { procesados: candidates.length };
};
