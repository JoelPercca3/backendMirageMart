import * as cartRepo from "../repositories/cart.repository.js";
import { pool } from "../config/database.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const getCart = async (userId) => {
  const items = await cartRepo.getByUser(userId);
  const subtotal = items.reduce((acc, i) => {
    return (
      acc +
      (Number(i.precio_unitario) + Number(i.precio_extra || 0)) * i.cantidad
    );
  }, 0);
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    total_items: items.length,
  };
};

export const addItem = async (
  userId,
  { product_id, variant_id, cantidad = 1 },
) => {
  const [[product]] = await pool.query(
    "SELECT id, stock_total, estado FROM products WHERE id = ? AND estado = 'activo'",
    [product_id],
  );
  if (!product) throw new AppError("Producto no disponible", 404);

  if (variant_id) {
    const [[variant]] = await pool.query(
      "SELECT id, stock FROM product_variants WHERE id = ? AND product_id = ? AND activo = 1",
      [variant_id, product_id],
    );
    if (!variant) throw new AppError("Variante no disponible", 404);
    if (variant.stock < cantidad)
      throw new AppError("Stock insuficiente para esta variante", 400);
  } else {
    if (product.stock_total < cantidad)
      throw new AppError(
        `Stock insuficiente. Disponible: ${product.stock_total}`,
        400,
      );
  }

  await cartRepo.addOrUpdate(userId, product_id, variant_id, cantidad);
  return getCart(userId);
};

export const updateQuantity = async (userId, cartItemId, cantidad) => {
  if (cantidad < 1) throw new AppError("La cantidad mínima es 1", 400);
  if (cantidad > 99) throw new AppError("La cantidad máxima es 99", 400);
  const ok = await cartRepo.updateQuantity(cartItemId, userId, cantidad);
  if (!ok) throw new AppError("Item no encontrado en el carrito", 404);
  return getCart(userId);
};

export const removeItem = async (userId, cartItemId) => {
  const ok = await cartRepo.removeItem(cartItemId, userId);
  if (!ok) throw new AppError("Item no encontrado en el carrito", 404);
  return getCart(userId);
};

export const clearCart = async (userId) => cartRepo.clearCart(userId);

export const applyCoupon = async (userId, coupon_code) => {
  const [[coupon]] = await pool.query(
    `SELECT * FROM coupons
     WHERE codigo = ? AND activo = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (uso_maximo IS NULL OR uso_actual < uso_maximo)`,
    [coupon_code],
  );
  if (!coupon) throw new AppError("Cupón inválido o expirado", 400);

  const cart = await getCart(userId);
  if (cart.subtotal < coupon.minimo_compra)
    throw new AppError(
      `Monto mínimo para este cupón: S/ ${coupon.minimo_compra}`,
      400,
    );

  let descuento = 0;
  if (coupon.tipo_descuento === "porcentaje") {
    descuento = (cart.subtotal * coupon.valor) / 100;
    if (coupon.maximo_descuento)
      descuento = Math.min(descuento, coupon.maximo_descuento);
  } else if (coupon.tipo_descuento === "monto_fijo") {
    descuento = Math.min(coupon.valor, cart.subtotal);
  }

  return {
    coupon: {
      id: coupon.id,
      codigo: coupon.codigo,
      tipo: coupon.tipo_descuento,
    },
    descuento: Number(descuento.toFixed(2)),
    subtotal_con_descuento: Number((cart.subtotal - descuento).toFixed(2)),
  };
};
