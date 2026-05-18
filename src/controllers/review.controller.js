import { pool } from "../config/database.js";
import { success, created, paginated } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const create = async (req, res, next) => {
  try {
    const { product_id, order_id, calificacion, titulo, comentario, imagenes } =
      req.body;
    if (order_id) {
      const [[item]] = await pool.query(
        "SELECT id FROM order_items WHERE order_id = ? AND product_id = ?",
        [order_id, product_id],
      );
      if (!item)
        throw new AppError(
          "Solo puedes reseñar productos que hayas comprado",
          403,
        );
    }
    const [result] = await pool.query(
      "INSERT INTO reviews (product_id, user_id, order_id, calificacion, titulo, comentario, imagenes) VALUES (?,?,?,?,?,?,?)",
      [
        product_id,
        req.user.id,
        order_id || null,
        calificacion,
        titulo || null,
        comentario || null,
        imagenes ? JSON.stringify(imagenes) : null,
      ],
    );
    await pool.query(
      `UPDATE products SET
        rating_promedio = (SELECT AVG(calificacion) FROM reviews WHERE product_id = ? AND aprobado = 1),
        rating_count    = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND aprobado = 1)
       WHERE id = ?`,
      [product_id, product_id, product_id],
    );
    created(
      res,
      { id: result.insertId },
      "Reseña enviada. Será publicada tras moderación.",
    );
  } catch (e) {
    next(e);
  }
};
export const update = async (req, res, next) => {
  try {
    const { calificacion, titulo, comentario } = req.body;
    await pool.query(
      "UPDATE reviews SET calificacion=?,titulo=?,comentario=?,aprobado=0 WHERE id=? AND user_id=?",
      [
        calificacion,
        titulo || null,
        comentario || null,
        req.params.id,
        req.user.id,
      ],
    );
    success(res, null, "Reseña actualizada");
  } catch (e) {
    next(e);
  }
};
export const remove = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM reviews WHERE id=? AND user_id=?", [
      req.params.id,
      req.user.id,
    ]);
    success(res, null, "Reseña eliminada");
  } catch (e) {
    next(e);
  }
};
export const markHelpful = async (req, res, next) => {
  try {
    await pool.query("UPDATE reviews SET util_count=util_count+1 WHERE id=?", [
      req.params.id,
    ]);
    success(res, null, "Marcada como útil");
  } catch (e) {
    next(e);
  }
};
export const getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM reviews",
    );
    const [rows] = await pool.query(
      `SELECT r.*, u.nombre as autor, p.nombre as producto FROM reviews r JOIN users u ON r.user_id=u.id JOIN products p ON r.product_id=p.id ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    paginated(res, { data: rows, total, page, limit });
  } catch (e) {
    next(e);
  }
};
export const approve = async (req, res, next) => {
  try {
    await pool.query("UPDATE reviews SET aprobado=1 WHERE id=?", [
      req.params.id,
    ]);
    const [[rev]] = await pool.query(
      "SELECT product_id FROM reviews WHERE id=?",
      [req.params.id],
    );
    if (rev)
      await pool.query(
        `UPDATE products SET rating_promedio=(SELECT AVG(calificacion) FROM reviews WHERE product_id=? AND aprobado=1), rating_count=(SELECT COUNT(*) FROM reviews WHERE product_id=? AND aprobado=1) WHERE id=?`,
        [rev.product_id, rev.product_id, rev.product_id],
      );
    success(res, null, "Reseña aprobada");
  } catch (e) {
    next(e);
  }
};

export const getByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND aprobado = 1",
      [productId],
    );

    const [rows] = await pool.query(
      `SELECT r.id, r.calificacion, r.titulo, r.comentario, r.imagenes, 
              r.util_count, r.created_at, u.nombre as autor
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? AND r.aprobado = 1 
       ORDER BY r.created_at DESC 
       LIMIT ? OFFSET ?`,
      [productId, Number(limit), Number(offset)],
    );

    paginated(res, {
      data: rows,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (e) {
    next(e);
  }
};
