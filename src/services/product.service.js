import * as productRepo from "../repositories/product.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { getPagination } from "../utils/paginate.js";
import { generateSlug } from "../utils/generateCode.js";
import { pool } from "../config/database.js";

// services/product.service.js
export const getAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const { category_id, brand_id, min_price, max_price, estado, search, sort } =
    query;

  // ✅ CORRECCIÓN: Si estado es string vacío, convertirlo a undefined (sin filtro)
  const estadoFilter = estado === "" ? undefined : estado;

  const { rows, total } = await productRepo.getAll({
    limit,
    offset,
    category_id,
    brand_id,
    min_price,
    max_price,
    estado: estadoFilter, // ← Usar el estado filtrado
    search,
    sort,
  });

  return { data: rows, total, page, limit };
};

export const getOne = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);
  return product;
};

export const getFeatured = () => productRepo.getFeatured(12);

export const search = async (q, query) => {
  if (!q || q.trim().length < 2)
    throw new AppError(
      "El término de búsqueda debe tener al menos 2 caracteres",
      400,
    );
  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await productRepo.getAll({
    limit,
    offset,
    search: q.trim(),
  });
  return { data: rows, total, page, limit };
};

export const getRelated = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);
  return productRepo.getRelated(id, product.category_id);
};

export const create = async (data) => {
  let slug = generateSlug(data.nombre);
  const existing = await productRepo.findBySlug(slug);
  if (existing)
    slug = generateSlug(data.nombre, Date.now().toString().slice(-5));
  const id = await productRepo.create({ ...data, slug });
  return productRepo.findById(id);
};

export const update = async (id, data) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);
  if (data.nombre && data.nombre !== product.nombre) {
    let slug = generateSlug(data.nombre);
    const existing = await productRepo.findBySlug(slug);
    if (existing && existing.id !== id)
      slug = generateSlug(data.nombre, String(id));
    data.slug = slug;
  }
  await productRepo.update(id, data);
  return productRepo.findById(id);
};

export const remove = async (id) => {
  const ok = await productRepo.remove(id);
  if (!ok) throw new AppError("Producto no encontrado", 404);
};

export const changeStatus = async (id, estado) => {
  const valid = ["activo", "inactivo", "agotado", "borrador"];
  if (!valid.includes(estado)) throw new AppError("Estado inválido", 400);
  const ok = await productRepo.update(id, { estado });
  if (!ok) throw new AppError("Producto no encontrado", 404);
};

export const updateStock = async (id, stock_total) => {
  if (stock_total < 0)
    throw new AppError("El stock no puede ser negativo", 400);
  await productRepo.update(id, {
    stock_total,
    estado: stock_total === 0 ? "agotado" : "activo",
  });
};

export const getReviews = async (productId, query) => {
  const { page, limit, offset } = getPagination(query);
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND aprobado = 1",
    [productId],
  );
  const [rows] = await pool.query(
    `SELECT r.id, r.calificacion, r.titulo, r.comentario, r.imagenes,
            r.util_count, r.created_at, u.nombre as autor, u.avatar_url
     FROM reviews r JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? AND r.aprobado = 1
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [productId, limit, offset],
  );
  return { data: rows, total, page, limit };
};
