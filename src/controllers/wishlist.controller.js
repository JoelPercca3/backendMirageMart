// wishlist.controller.js
import { pool } from "../config/database.js";
import { success } from "../utils/response.js";

export const getWishlist = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.id, w.created_at, p.id as product_id, p.nombre, p.slug,
              COALESCE(p.precio_oferta, p.precio_base) as precio_final,
              p.precio_base, p.porcentaje_desc, p.rating_promedio,
              pi.url as imagen_principal
       FROM wishlist w JOIN products p ON w.product_id=p.id
       LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.es_principal=1
       WHERE w.user_id=? ORDER BY w.id DESC`,
      [req.user.id],
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const toggle = async (req, res, next) => {
  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM wishlist WHERE user_id=? AND product_id=?",
      [req.user.id, req.params.productId],
    );
    if (existing) {
      await pool.query("DELETE FROM wishlist WHERE id=?", [existing.id]);
      success(res, { in_wishlist: false }, "Eliminado de favoritos");
    } else {
      await pool.query(
        "INSERT INTO wishlist (user_id,product_id) VALUES(?,?)",
        [req.user.id, req.params.productId],
      );
      success(res, { in_wishlist: true }, "Agregado a favoritos");
    }
  } catch (e) {
    next(e);
  }
};
export const clearAll = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM wishlist WHERE user_id=?", [req.user.id]);
    success(res, null, "Lista de deseos vaciada");
  } catch (e) {
    next(e);
  }
};
