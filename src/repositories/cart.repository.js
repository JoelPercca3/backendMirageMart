import { pool } from "../config/database.js";

export const getByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
      c.id,
      c.user_id,
      c.product_id,
      c.variant_id,
      c.cantidad,
      c.updated_at,
      c.precio_unitario,
      c.precio_extra,
      p.nombre as product_name,
      p.precio_base,
      p.precio_oferta,
      p.descripcion_corta,
      p.sku,
      pv.opciones as variant_opciones,
      COALESCE(
        (SELECT url FROM product_images WHERE variant_id = c.variant_id AND es_principal = 1 LIMIT 1),
        (SELECT url FROM product_images WHERE product_id = p.id AND es_principal = 1 LIMIT 1)
      ) as imagen
    FROM cart c
    JOIN products p ON c.product_id = p.id
    LEFT JOIN product_variants pv ON c.variant_id = pv.id
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC`,
    [userId],
  );

  return rows;
};

export const addOrUpdate = async (userId, productId, variantId, cantidad) => {
  // 🔥 Obtener el precio correcto del producto
  let precioUnitario = null;
  let precioExtra = 0;

  if (variantId) {
    // Obtener precio de la variante
    const [variantRows] = await pool.query(
      `SELECT 
        COALESCE(p.precio_oferta, p.precio_base) as precio,
        pv.precio_extra
       FROM products p
       JOIN product_variants pv ON pv.product_id = p.id
       WHERE p.id = ? AND pv.id = ?`,
      [productId, variantId],
    );
    if (variantRows.length > 0) {
      precioUnitario = variantRows[0].precio;
      precioExtra = variantRows[0].precio_extra || 0;
    }
  } else {
    // Obtener precio del producto sin variante
    const [productRows] = await pool.query(
      "SELECT COALESCE(precio_oferta, precio_base) as precio FROM products WHERE id = ?",
      [productId],
    );
    if (productRows.length > 0) {
      precioUnitario = productRows[0].precio;
    }
  }

  // Verificar si ya existe
  const [existing] = await pool.query(
    `SELECT id, cantidad FROM cart 
     WHERE user_id = ? AND product_id = ? 
     AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
    [userId, productId, variantId || null, variantId || null],
  );

  if (existing.length > 0) {
    // Actualizar sumando cantidad
    const nuevaCantidad = existing[0].cantidad + cantidad;
    await pool.query(
      "UPDATE cart SET cantidad = ?, updated_at = NOW() WHERE id = ?",
      [nuevaCantidad, existing[0].id],
    );
  } else {
    // ✅ Insertar nuevo con los precios correctos
    await pool.query(
      `INSERT INTO cart (user_id, product_id, variant_id, cantidad, precio_unitario, precio_extra, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        productId,
        variantId || null,
        cantidad,
        precioUnitario,
        precioExtra,
      ],
    );
  }
};
export const updateQuantity = async (cartItemId, userId, cantidad) => {
  const [result] = await pool.query(
    "UPDATE cart SET cantidad = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
    [cantidad, cartItemId, userId],
  );
  return result.affectedRows > 0;
};

export const removeItem = async (cartItemId, userId) => {
  const [result] = await pool.query(
    "DELETE FROM cart WHERE id = ? AND user_id = ?",
    [cartItemId, userId],
  );
  return result.affectedRows > 0;
};

export const clearCart = async (userId, conn = pool) => {
  await conn.query("DELETE FROM cart WHERE user_id = ?", [userId]);
};
