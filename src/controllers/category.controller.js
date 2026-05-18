import { pool } from "../config/database.js";
import { success, created, paginated, error } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { generateSlug } from "../utils/generateCode.js";

export const getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(p.id) as total_productos
       FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.estado='activo'
       WHERE c.activo=1 GROUP BY c.id ORDER BY c.orden, c.nombre`,
    );
    const map = {};
    const roots = [];
    rows.forEach((r) => {
      map[r.id] = { ...r, children: [] };
    });
    rows.forEach((r) => {
      r.parent_id && map[r.parent_id]
        ? map[r.parent_id].children.push(map[r.id])
        : roots.push(map[r.id]);
    });
    success(res, roots);
  } catch (e) {
    next(e);
  }
};
export const getOne = async (req, res, next) => {
  try {
    const [[cat]] = await pool.query(
      "SELECT * FROM categories WHERE id=? LIMIT 1",
      [req.params.id],
    );
    if (!cat) return error(res, "Categoría no encontrada", 404);
    const [children] = await pool.query(
      "SELECT * FROM categories WHERE parent_id=? AND activo=1",
      [cat.id],
    );
    success(res, { ...cat, children });
  } catch (e) {
    next(e);
  }
};
export const getProducts = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM products WHERE category_id=? AND estado='activo'",
      [req.params.id],
    );
    const [rows] = await pool.query(
      `SELECT p.id,p.nombre,p.slug,COALESCE(p.precio_oferta,p.precio_base) as precio_final,p.precio_base,p.precio_oferta,p.porcentaje_desc,p.rating_promedio,pi.url as imagen_principal
       FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.es_principal=1
       WHERE p.category_id=? AND p.estado='activo' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset],
    );
    paginated(res, { data: rows, total, page, limit });
  } catch (e) {
    next(e);
  }
};
export const create = async (req, res, next) => {
  try {
    const slug = generateSlug(req.body.nombre);
    const [result] = await pool.query(
      "INSERT INTO categories (parent_id,nombre,slug,descripcion,imagen_url,orden) VALUES(?,?,?,?,?,?)",
      [
        req.body.parent_id || null,
        req.body.nombre,
        slug,
        req.body.descripcion || null,
        req.body.imagen_url || null,
        req.body.orden || 0,
      ],
    );
    created(res, { id: result.insertId }, "Categoría creada");
  } catch (e) {
    next(e);
  }
};
export const update = async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE categories SET nombre=?,descripcion=?,imagen_url=?,orden=?,activo=? WHERE id=?",
      [
        req.body.nombre,
        req.body.descripcion,
        req.body.imagen_url,
        req.body.orden || 0,
        req.body.activo ?? 1,
        req.params.id,
      ],
    );
    success(res, null, "Categoría actualizada");
  } catch (e) {
    next(e);
  }
};
export const remove = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM categories WHERE id=?", [req.params.id]);
    success(res, null, "Categoría eliminada");
  } catch (e) {
    next(e);
  }
};
