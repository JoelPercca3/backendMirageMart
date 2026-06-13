import { pool } from "../config/database.js";
import * as cartRepo from "../repositories/cart.repository.js";
import * as orderRepo from "../repositories/order.repository.js";
import * as productRepo from "../repositories/product.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { generateOrderCode } from "../utils/generateCode.js";
import { getPagination } from "../utils/paginate.js";

export const create = async (
  userId,
  { address_id, shipping_method_id, coupon_code, notas_cliente },
  ip,
) => {
  // Validar y convertir IDs
  address_id = Number(address_id);
  shipping_method_id = Number(shipping_method_id);

  if (isNaN(address_id)) address_id = 0;
  if (isNaN(shipping_method_id)) shipping_method_id = 0;

  // Obtener carrito
  const cartItems = await cartRepo.getByUser(userId);
  if (!cartItems.length) throw new AppError("El carrito está vacío", 400);

  // Obtener método de envío
  const [shippingRows] = await pool.query(
    "SELECT * FROM shipping_methods WHERE id = ? AND activo = 1",
    [shipping_method_id],
  );
  const shippingRow = shippingRows[0];
  if (!shippingRow) throw new AppError("Método de envío inválido", 400);

  // Calcular subtotal
  const subtotal = cartItems.reduce((acc, item) => {
    const precioUnitario = Number(item.precio_unitario) || 0;
    const precioExtra = Number(item.precio_extra) || 0;
    const cantidad = Number(item.cantidad) || 0;
    return acc + (precioUnitario + precioExtra) * cantidad;
  }, 0);

  if (isNaN(subtotal)) {
    throw new AppError("Error al calcular el subtotal", 400);
  }

  const costo_envio = Number(shippingRow.precio) || 0;

  // Calcular descuento
  let descuento = 0;
  let coupon_id = null;

  if (coupon_code) {
    const [[coupon]] = await pool.query(
      `SELECT * FROM coupons WHERE codigo = ? AND activo = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (uso_maximo IS NULL OR uso_actual < uso_maximo)`,
      [coupon_code],
    );

    if (!coupon) {
      throw new AppError("Cupón inválido o expirado", 400);
    }

    if (subtotal < coupon.minimo_compra) {
      throw new AppError(
        `Monto mínimo para este cupón: S/ ${coupon.minimo_compra}`,
        400,
      );
    }

    coupon_id = coupon.id;

    if (coupon.tipo_descuento === "porcentaje") {
      descuento = (subtotal * Number(coupon.valor)) / 100;
      if (coupon.maximo_descuento) {
        descuento = Math.min(descuento, Number(coupon.maximo_descuento));
      }
    } else if (coupon.tipo_descuento === "monto_fijo") {
      descuento = Math.min(Number(coupon.valor), subtotal);
    } else if (coupon.tipo_descuento === "envio_gratis") {
      descuento = costo_envio;
    }
  }

  // Ajustar costo_envio si el cupón es envío gratis
  const finalCostoEnvio =
    coupon_id && descuento === costo_envio ? 0 : costo_envio;

  // Calcular total
  let total = subtotal - descuento + finalCostoEnvio;
  total = Math.round(total * 100) / 100;

  if (isNaN(total)) {
    throw new AppError("Error al calcular el total", 400);
  }

  const codigo_orden = generateOrderCode();

  // Crear conexión para transacción
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Validar stock
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

    // Preparar items de la orden
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

    // Crear orden
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

    // Actualizar uso del cupón
    if (coupon_id) {
      await conn.query(
        "UPDATE coupons SET uso_actual = uso_actual + 1 WHERE id = ?",
        [coupon_id],
      );
    }

    // Actualizar ventas
    for (const item of cartItems) {
      await conn.query(
        "UPDATE products SET ventas_count = ventas_count + ? WHERE id = ?",
        [item.cantidad, item.product_id],
      );
    }

    // Limpiar carrito
    await cartRepo.clearCart(userId, conn);

    await conn.commit();
    conn.release();

    return orderRepo.findById(orderId, userId);
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
};

export const myOrders = async (userId, query) => {
  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await orderRepo.findByUser(userId, { limit, offset });

  return {
    data: rows,
    total: total,
    page,
    limit,
  };
};

export const getOne = async (id, userId, rol) => {
  const order = await orderRepo.findById(id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (rol !== "admin" && order.user_id !== userId)
    throw new AppError("No tienes permiso para ver este pedido", 403);
  return order;
};

export const cancel = async (id, userId) => {
  const order = await orderRepo.findById(id, userId);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  if (order.user_id !== userId) throw new AppError("No autorizado", 403);
  if (!["pendiente", "pagado"].includes(order.estado))
    throw new AppError("Este pedido ya no puede cancelarse", 400);

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
    page: page,
    limit: limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

export const updateStatus = async (id, estado, comentario, adminId) => {
  const order = await orderRepo.findById(id);
  if (!order) throw new AppError("Pedido no encontrado", 404);
  await orderRepo.updateStatus(id, estado, comentario, adminId);
};

export const updateTracking = async (id, tracking_number) => {
  await orderRepo.updateTracking(id, tracking_number);
  await orderRepo.updateStatus(id, "enviado", `Tracking: ${tracking_number}`);
};
