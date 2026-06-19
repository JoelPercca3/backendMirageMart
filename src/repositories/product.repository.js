import { pool } from "../config/database.js";
// repositories/product.repository.js

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

  // ✅ BUSCAR CON SINÓNIMOS (recibe términos separados por coma)
  if (search) {
    const terminos = search
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    console.log("🔍 Términos de búsqueda (admin):", terminos);

    if (terminos.length > 0) {
      const conditions = terminos
        .map(
          () =>
            "(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ? OR p.tags LIKE ?)",
        )
        .join(" OR ");
      where += ` AND (${conditions})`;
      terminos.forEach((t) => {
        const like = `%${t}%`;
        params.push(like, like, like, like);
      });
    }
  }

  // ─── FILTROS ────────────────────────────────────────────────────────────────
  if (category_id) {
    where += " AND p.category_id = ?";
    params.push(category_id);
  }

  if (brand_id) {
    where += " AND p.brand_id = ?";
    params.push(brand_id);
  }

  if (min_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) >= ?";
    params.push(parseFloat(min_price));
  }

  if (max_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) <= ?";
    params.push(parseFloat(max_price));
  }

  if (estado !== undefined && estado !== "") {
    where += " AND p.estado = ?";
    params.push(estado);
  }

  // ─── ORDEN ──────────────────────────────────────────────────────────────────
  let orderBy = "ORDER BY p.id DESC";
  if (sort) {
    const [field, direction] = sort.split(":");
    const dir = direction === "desc" ? "DESC" : "ASC";
    if (field === "precio") {
      orderBy = `ORDER BY COALESCE(p.precio_oferta, p.precio_base) ${dir}`;
    } else if (field === "nombre") {
      orderBy = `ORDER BY p.nombre ${dir}`;
    } else if (field === "created_at") {
      orderBy = `ORDER BY p.created_at ${dir}`;
    } else if (field === "ventas") {
      orderBy = `ORDER BY p.ventas_count DESC`;
    } else if (field === "rating") {
      orderBy = `ORDER BY p.rating_promedio DESC`;
    }
  }

  // ─── COUNT ──────────────────────────────────────────────────────────────────
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM products p ${where}`,
    params,
  );

  // ─── QUERY ──────────────────────────────────────────────────────────────────
  const [rows] = await pool.query(
    `SELECT 
      p.*,
      c.nombre as categoria,
      b.nombre as marca,
      (
        SELECT COUNT(*)
        FROM order_items
        WHERE product_id = p.id
      ) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     ${where}
     ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // ─── IMÁGENES ──────────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const productIds = rows.map((row) => row.id);
    const [allImages] = await pool.query(
      `SELECT product_id, id, url, variant_id, es_principal, orden, alt_text
       FROM product_images
       WHERE product_id IN (?)
       ORDER BY product_id, variant_id IS NULL DESC, variant_id, orden`,
      [productIds],
    );

    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) {
        imagesMap[img.product_id] = [];
      }
      imagesMap[img.product_id].push({
        id: img.id,
        url: img.url,
        variant_id: img.variant_id,
        es_principal: img.es_principal,
        orden: img.orden,
        alt_text: img.alt_text,
      });
    });

    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  } else {
    rows.forEach((row) => {
      row.images = [];
    });
  }

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

  // ✅ CORREGIDO: Orden: primero imágenes base, luego por variante
  const [images] = await pool.query(
    `SELECT id, url, alt_text, es_principal, orden, variant_id 
     FROM product_images 
     WHERE product_id = ? 
     ORDER BY variant_id IS NULL DESC, variant_id, orden`,
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
            p.precio_base, p.precio_oferta, p.porcentaje_desc, p.rating_promedio
     FROM products p
     WHERE p.estado = 'activo' AND p.es_destacado = 1
     ORDER BY p.ventas_count DESC LIMIT ?`,
    [limit],
  );

  if (rows.length > 0) {
    const productIds = rows.map((row) => row.id);
    const [allImages] = await pool.query(
      `SELECT product_id, id, url, variant_id, es_principal, orden
       FROM product_images
       WHERE product_id IN (?)
       ORDER BY product_id, variant_id IS NULL DESC, variant_id, orden`,
      [productIds],
    );

    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push({
        id: img.id,
        url: img.url,
        variant_id: img.variant_id,
        es_principal: img.es_principal,
        orden: img.orden,
      });
    });

    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return rows;
};

export const getRelated = async (productId, categoryId, limit = 8) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.slug,
            COALESCE(p.precio_oferta, p.precio_base) as precio_final,
            p.precio_base, p.precio_oferta, p.porcentaje_desc, p.rating_promedio
     FROM products p
     WHERE p.category_id = ? AND p.id != ? AND p.estado = 'activo'
     ORDER BY p.ventas_count DESC LIMIT ?`,
    [categoryId, productId, limit],
  );

  if (rows.length > 0) {
    const productIds = rows.map((row) => row.id);
    const [allImages] = await pool.query(
      `SELECT product_id, id, url, variant_id, es_principal, orden, alt_text
       FROM product_images
       WHERE product_id IN (?)
       ORDER BY product_id, variant_id IS NULL DESC, variant_id, orden`,
      [productIds],
    );

    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) {
        imagesMap[img.product_id] = [];
      }
      imagesMap[img.product_id].push({
        id: img.id,
        url: img.url,
        variant_id: img.variant_id,
        es_principal: img.es_principal,
        orden: img.orden,
        alt_text: img.alt_text,
      });
    });

    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return rows;
};

export const updateStock = async (id, cantidad, conn = pool) => {
  const [result] = await conn.query(
    "UPDATE products SET stock_total = stock_total - ? WHERE id = ? AND stock_total >= ?",
    [cantidad, id, cantidad],
  );
  return result.affectedRows > 0;
};
