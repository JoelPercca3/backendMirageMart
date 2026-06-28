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
      c.precio_base,
      c.porcentaje_desc,
      c.rating_promedio,
      c.rating_count,
      c.ventas_count,
      p.nombre as product_name,
      p.precio_base as product_precio_base,
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
  // 🔥 Obtener TODOS los datos del producto
  let precioUnitario = null;
  let precioExtra = 0;
  let precioBase = 0;
  let porcentajeDesc = 0;
  let ratingPromedio = 0;
  let ratingCount = 0;
  let ventasCount = 0;

  if (variantId) {
    const [variantRows] = await pool.query(
      `SELECT 
        COALESCE(p.precio_oferta, p.precio_base) as precio,
        p.precio_base,
        p.porcentaje_desc,
        p.rating_promedio,
        p.rating_count,
        p.ventas_count,
        pv.precio_extra
       FROM products p
       JOIN product_variants pv ON pv.product_id = p.id
       WHERE p.id = ? AND pv.id = ?`,
      [productId, variantId],
    );
    if (variantRows.length > 0) {
      precioUnitario = variantRows[0].precio;
      precioExtra = variantRows[0].precio_extra || 0;
      precioBase = variantRows[0].precio_base || 0;
      porcentajeDesc = variantRows[0].porcentaje_desc || 0;
      ratingPromedio = variantRows[0].rating_promedio || 0;
      ratingCount = variantRows[0].rating_count || 0;
      ventasCount = variantRows[0].ventas_count || 0;
    }
  } else {
    const [productRows] = await pool.query(
      `SELECT 
        COALESCE(precio_oferta, precio_base) as precio,
        precio_base,
        porcentaje_desc,
        rating_promedio,
        rating_count,
        ventas_count
       FROM products 
       WHERE id = ?`,
      [productId],
    );
    if (productRows.length > 0) {
      precioUnitario = productRows[0].precio;
      precioBase = productRows[0].precio_base || 0;
      porcentajeDesc = productRows[0].porcentaje_desc || 0;
      ratingPromedio = productRows[0].rating_promedio || 0;
      ratingCount = productRows[0].rating_count || 0;
      ventasCount = productRows[0].ventas_count || 0;
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
    const nuevaCantidad = existing[0].cantidad + cantidad;
    await pool.query(
      "UPDATE cart SET cantidad = ?, updated_at = NOW() WHERE id = ?",
      [nuevaCantidad, existing[0].id],
    );
  } else {
    // ✅ Insertar con TODOS los datos
    await pool.query(
      `INSERT INTO cart (
        user_id, product_id, variant_id, cantidad, 
        precio_unitario, precio_extra, 
        precio_base, porcentaje_desc, 
        rating_promedio, rating_count, ventas_count,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        productId,
        variantId || null,
        cantidad,
        precioUnitario,
        precioExtra,
        precioBase,
        porcentajeDesc,
        ratingPromedio,
        ratingCount,
        ventasCount,
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
