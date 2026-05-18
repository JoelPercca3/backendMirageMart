import { pool } from "../config/database.js";

export const getByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.cantidad, c.variant_id,
            p.id as product_id, p.nombre, p.slug, p.sku,
            COALESCE(p.precio_oferta, p.precio_base) as precio_unitario,
            p.stock_total,
            pi.url as imagen,
            pv.opciones as variante_opciones,
            pv.sku_variante, pv.precio_extra,
            pv.stock as variante_stock
     FROM cart c
     JOIN products p ON c.product_id = p.id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.es_principal = 1
     LEFT JOIN product_variants pv ON c.variant_id = pv.id
     WHERE c.user_id = ?
     ORDER BY c.id DESC`,
    [userId],
  );
  return rows;
};

export const addOrUpdate = async (userId, productId, variantId, cantidad) => {
  await pool.query(
    `INSERT INTO cart (user_id, product_id, variant_id, cantidad)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
    [userId, productId, variantId || null, cantidad],
  );
};

export const updateQuantity = async (cartItemId, userId, cantidad) => {
  const [result] = await pool.query(
    "UPDATE cart SET cantidad = ? WHERE id = ? AND user_id = ?",
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
