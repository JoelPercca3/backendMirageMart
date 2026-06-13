import * as cartRepo from "../repositories/cart.repository.js";
import { pool } from "../config/database.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const getCart = async (userId) => {
  // console.log("📥 getCart llamado para userId:", userId);

  const items = await cartRepo.getByUser(userId);
  // console.log("📦 Items encontrados en repositorio:", items);

  const subtotal = items.reduce((acc, i) => {
    return (
      acc +
      (Number(i.precio_unitario) + Number(i.precio_extra || 0)) * i.cantidad
    );
  }, 0);

  const result = {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    total_items: items.length,
  };

  // console.log("📤 getCart retornando:", result);
  return result;
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

  let stockDisponible = product.stock_total;

  if (variant_id) {
    const [[variant]] = await pool.query(
      "SELECT id, stock FROM product_variants WHERE id = ? AND product_id = ? AND activo = 1",
      [variant_id, product_id],
    );
    if (!variant) throw new AppError("Variante no disponible", 404);
    stockDisponible = variant.stock;
  }

  // Verificar si ya existe en el carrito
  const [existingItem] = await pool.query(
    "SELECT id, cantidad FROM cart WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))",
    [userId, product_id, variant_id || null, variant_id || null],
  );

  let nuevaCantidad = cantidad;

  if (existingItem.length > 0) {
    nuevaCantidad = existingItem[0].cantidad + cantidad;
  }

  if (nuevaCantidad > stockDisponible) {
    throw new AppError(
      `Stock insuficiente. Disponible: ${stockDisponible}. Ya tienes ${existingItem[0]?.cantidad || 0} en tu carrito.`,
      400,
    );
  }

  await cartRepo.addOrUpdate(userId, product_id, variant_id, cantidad);
  return getCart(userId);
};

export const updateQuantity = async (userId, cartItemId, cantidad) => {
  if (cantidad < 1) throw new AppError("La cantidad mínima es 1", 400);
  if (cantidad > 99) throw new AppError("La cantidad máxima es 99", 400);

  // Obtener el item del carrito
  const [item] = await pool.query(
    `SELECT c.id, c.product_id, c.variant_id, 
            p.stock_total as product_stock,
            pv.stock as variant_stock
     FROM cart c
     JOIN products p ON c.product_id = p.id
     LEFT JOIN product_variants pv ON c.variant_id = pv.id
     WHERE c.id = ? AND c.user_id = ?`,
    [cartItemId, userId],
  );

  if (item.length === 0) {
    throw new AppError("Item no encontrado en el carrito", 404);
  }

  const stockDisponible = item[0].variant_stock || item[0].product_stock;

  if (cantidad > stockDisponible) {
    throw new AppError(
      `Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles`,
      400,
    );
  }

  const ok = await cartRepo.updateQuantity(cartItemId, userId, cantidad);
  if (!ok) throw new AppError("Item no encontrado en el carrito", 404);
  return getCart(userId);
};

export const removeItem = async (userId, cartItemId) => {
  const [item] = await pool.query(
    "SELECT id FROM cart WHERE id = ? AND user_id = ?",
    [cartItemId, userId],
  );

  if (item.length === 0) {
    throw new AppError("Item no encontrado en el carrito", 404);
  }

  const ok = await cartRepo.removeItem(cartItemId, userId);
  if (!ok) throw new AppError("Item no encontrado en el carrito", 404);
  return getCart(userId);
};

export const clearCart = async (userId) => {
  return cartRepo.clearCart(userId);
};

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

export const mergeCart = async (userId, items) => {
  if (!items || !items.length) {
    return { merged: 0 };
  }

  let mergedCount = 0;

  for (const item of items) {
    // Verificar si el producto existe
    const [[product]] = await pool.query(
      "SELECT id, stock_total, estado, precio_base, precio_oferta FROM products WHERE id = ? AND estado = 'activo'",
      [item.product_id],
    );

    if (!product) {
      console.log(`❌ Producto ${item.product_id} no encontrado`);
      continue;
    }

    // Calcular precios
    let precioUnitario = Number(product.precio_oferta || product.precio_base);
    let precioExtra = 0;
    let stockDisponible = product.stock_total;

    // Si tiene variante, obtener precio extra y stock
    if (item.variant_id) {
      const [[variant]] = await pool.query(
        "SELECT id, stock, precio_extra FROM product_variants WHERE id = ? AND product_id = ? AND activo = 1",
        [item.variant_id, item.product_id],
      );

      if (!variant) {
        console.log(`❌ Variante ${item.variant_id} no encontrada`);
        continue;
      }

      precioExtra = Number(variant.precio_extra) || 0;
      stockDisponible = variant.stock;
    }

    // Validar stock
    let cantidadAInsertar = item.cantidad || 1;
    if (cantidadAInsertar > stockDisponible) {
      cantidadAInsertar = stockDisponible;
      if (cantidadAInsertar === 0) continue;
    }

    // Verificar si ya existe en el carrito del usuario
    const [existing] = await pool.query(
      `SELECT id, cantidad FROM cart 
       WHERE user_id = ? AND product_id = ? 
       AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
      [
        userId,
        item.product_id,
        item.variant_id || null,
        item.variant_id || null,
      ],
    );

    if (existing.length > 0) {
      // Actualizar sumando cantidad
      const nuevaCantidad = existing[0].cantidad + cantidadAInsertar;
      const cantidadFinal = Math.min(nuevaCantidad, stockDisponible);

      await pool.query(
        `UPDATE cart 
         SET cantidad = ?, updated_at = NOW() 
         WHERE id = ?`,
        [cantidadFinal, existing[0].id],
      );
    } else {
      // Insertar nuevo item con los precios correctos
      await pool.query(
        `INSERT INTO cart (user_id, product_id, variant_id, cantidad, precio_unitario, precio_extra, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          item.product_id,
          item.variant_id || null,
          cantidadAInsertar,
          precioUnitario,
          precioExtra,
        ],
      );
    }
    mergedCount++;
  }

  return { merged: mergedCount };
};
