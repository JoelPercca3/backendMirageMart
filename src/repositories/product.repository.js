import { pool } from "../config/database.js";

export const getAll = async ({
  limit,
  offset,
  category_id,
  brand_id,
  min_price,
  max_price,
  estado,
  search,
  sort,
}) => {
  let where = "WHERE 1=1";
  const params = [];

  if (search) {
    where += " AND (p.nombre LIKE ? OR p.sku LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category_id) {
    where += " AND p.category_id = ?";
    params.push(category_id);
  }

  if (brand_id) {
    where += " AND p.brand_id = ?";
    params.push(brand_id);
  }

  if (min_price) {
    where += " AND p.precio_final >= ?";
    params.push(min_price);
  }

  if (max_price) {
    where += " AND p.precio_final <= ?";
    params.push(max_price);
  }

  if (estado !== undefined && estado !== null && estado !== "") {
    where += " AND p.estado = ?";
    params.push(estado);
  }

  let orderBy = "ORDER BY p.id DESC";
  if (sort) {
    const [field, direction] = sort.split(":");
    if (field === "precio") {
      orderBy = `ORDER BY p.precio_final ${direction === "desc" ? "DESC" : "ASC"}`;
    } else if (field === "nombre") {
      orderBy = `ORDER BY p.nombre ${direction === "desc" ? "DESC" : "ASC"}`;
    } else if (field === "created_at") {
      orderBy = `ORDER BY p.created_at ${direction === "desc" ? "DESC" : "ASC"}`;
    }
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM products p ${where}`,
    params,
  );

  // ✅ Usar las tablas correctas en inglés: categories y brands
  // ✅ Obtener la primera imagen de product_images
  const [rows] = await pool.query(
    `SELECT 
    p.*,
    c.nombre as categoria,
    b.nombre as marca,
    (SELECT url FROM product_images WHERE product_id = p.id AND es_principal = 1 LIMIT 1) as imagen_principal,
    (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
   FROM products p 
   LEFT JOIN categories c ON p.category_id = c.id 
   LEFT JOIN brands b ON p.brand_id = b.id 
   ${where} 
   ${orderBy} 
   LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria, c.slug as categoria_slug,
            b.nombre as marca, b.logo_url as marca_logo
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.id = ? LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;

  const [images] = await pool.query(
    "SELECT id, url, alt_text, es_principal, orden FROM product_images WHERE product_id = ? ORDER BY orden",
    [id],
  );
  const [attrs] = await pool.query(
    "SELECT atributo, valor FROM product_attributes WHERE product_id = ?",
    [id],
  );
  const [variants] = await pool.query(
    "SELECT id, sku_variante, opciones, precio_extra, stock, imagen_url FROM product_variants WHERE product_id = ? AND activo = 1",
    [id],
  );

  pool.query(
    "UPDATE products SET vistas_count = vistas_count + 1 WHERE id = ?",
    [id],
  );

  return { ...rows[0], images, atributos: attrs, variants };
};

export const findBySlug = async (slug) => {
  const [rows] = await pool.query(
    "SELECT id FROM products WHERE slug = ? LIMIT 1",
    [slug],
  );
  return rows[0] || null;
};

export const create = async (data) => {
  const {
    nombre,
    slug,
    descripcion,
    descripcion_corta,
    category_id,
    brand_id,
    precio_base,
    precio_oferta,
    sku,
    stock_total,
    peso_kg,
    estado,
    es_destacado,
    es_nuevo,
    tags,
  } = data;
  const [result] = await pool.query(
    `INSERT INTO products (nombre, slug, descripcion, descripcion_corta, category_id, brand_id,
      precio_base, precio_oferta, sku, stock_total, peso_kg, estado, es_destacado, es_nuevo, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      slug,
      descripcion,
      descripcion_corta,
      category_id,
      brand_id,
      precio_base,
      precio_oferta || null,
      sku,
      stock_total,
      peso_kg || null,
      estado,
      es_destacado ? 1 : 0,
      es_nuevo ? 1 : 0,
      tags ? JSON.stringify(tags) : null,
    ],
  );
  return result.insertId;
};

export const update = async (id, data) => {
  const allowed = [
    "nombre",
    "slug",
    "descripcion",
    "descripcion_corta",
    "category_id",
    "brand_id",
    "precio_base",
    "precio_oferta",
    "sku",
    "stock_total",
    "peso_kg",
    "estado",
    "es_destacado",
    "es_nuevo",
    "tags",
  ];
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = ?`);
      values.push(k === "tags" ? JSON.stringify(v) : v);
    }
  }
  if (!sets.length) return false;
  values.push(id);
  await pool.query(
    `UPDATE products SET ${sets.join(", ")} WHERE id = ?`,
    values,
  );
  return true;
};

export const remove = async (id) => {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const getFeatured = async (limit = 12) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.slug,
            COALESCE(p.precio_oferta, p.precio_base) as precio_final,
            p.precio_base, p.precio_oferta, p.porcentaje_desc, p.rating_promedio,
            pi.url as imagen_principal
     FROM products p
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.es_principal = 1
     WHERE p.estado = 'activo' AND p.es_destacado = 1
     ORDER BY p.ventas_count DESC LIMIT ?`,
    [limit],
  );
  return rows;
};

export const getRelated = async (productId, categoryId, limit = 8) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.slug,
            COALESCE(p.precio_oferta, p.precio_base) as precio_final,
            p.precio_base, p.precio_oferta, p.porcentaje_desc, p.rating_promedio,
            pi.url as imagen_principal
     FROM products p
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.es_principal = 1
     WHERE p.category_id = ? AND p.id != ? AND p.estado = 'activo'
     ORDER BY p.ventas_count DESC LIMIT ?`,
    [categoryId, productId, limit],
  );
  return rows;
};

export const updateStock = async (id, cantidad, conn = pool) => {
  const [result] = await conn.query(
    "UPDATE products SET stock_total = stock_total - ? WHERE id = ? AND stock_total >= ?",
    [cantidad, id, cantidad],
  );
  return result.affectedRows > 0;
};
