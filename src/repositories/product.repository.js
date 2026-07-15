import { pool } from "../config/database.js";

// ─── OBTENER TODOS LOS PRODUCTOS ─────────────────────────────────────────────
export const getAll = async ({
  limit,
  offset,
  category_id,
  brand_id,
  min_price,
  max_price,
  talla,
  color,
  estado,
  search,
  sort,
}) => {
  let where = "WHERE 1=1";
  const params = [];

  // ─── BÚSQUEDA ──────────────────────────────────────────────────────────────
  if (search && search.trim()) {
    const terms = search
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const searchConditions = terms
      .map(() => "(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ?)")
      .join(" OR ");
    where += ` AND (${searchConditions})`;
    terms.forEach((t) => {
      params.push(`%${t}%`, `%${t}%`, `%${t}%`);
    });
  }

  // ─── CATEGORY_ID (ARRAY) ──────────────────────────────────────────────────
  if (category_id && Array.isArray(category_id) && category_id.length > 0) {
    const placeholders = category_id.map(() => "?").join(", ");
    where += ` AND p.category_id IN (${placeholders})`;
    params.push(...category_id);
  } else if (category_id) {
    where += " AND p.category_id = ?";
    params.push(category_id);
  }

  // ─── BRAND_ID ─────────────────────────────────────────────────────────────
  if (brand_id) {
    where += " AND p.brand_id = ?";
    params.push(brand_id);
  }

  // ─── PRECIO ──────────────────────────────────────────────────────────────
  if (min_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) >= ?";
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) <= ?";
    params.push(parseFloat(max_price));
  }

  // ─── TALLA (multi-selección) ─────────────────────────────────────────────
  if (talla) {
    const tallas = talla.split(",").filter(Boolean);
    if (tallas.length > 0) {
      const placeholders = tallas.map(() => "?").join(", ");
      where += ` AND EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id
      AND pv.activo = 1
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Talla')) IN (${placeholders})
    )`;
      params.push(...tallas);
    }
  }

  // ─── COLOR (multi-selección) ─────────────────────────────────────────────
  if (color) {
    const colores = color.split(",").filter(Boolean);
    if (colores.length > 0) {
      const placeholders = colores.map(() => "?").join(", ");
      where += ` AND EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id
      AND pv.activo = 1
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) IN (${placeholders})
    )`;
      params.push(...colores);
    }
  }

  // ─── ESTADO ──────────────────────────────────────────────────────────────
  if (estado && estado !== "") {
    where += " AND p.estado = ?";
    params.push(estado);
  }

  // ─── ORDER BY ─────────────────────────────────────────────────────────────
  let orderBy = "p.created_at DESC";
  if (sort) {
    const parts = sort.split(":");
    const field = parts[0];
    const direction = parts.length > 1 ? parts[1] : "asc";
    const allowedFields = [
      "precio_base",
      "precio_oferta",
      "created_at",
      "ventas_count",
      "rating_promedio",
    ];
    if (
      allowedFields.includes(field) &&
      ["asc", "desc"].includes(direction.toLowerCase())
    ) {
      if (field === "ventas_count") {
        orderBy = `ventas_count ${direction}`;
      } else if (field === "precio_base" || field === "precio_oferta") {
        orderBy = `COALESCE(p.precio_oferta, p.precio_base) ${direction}`;
      } else {
        orderBy = `p.${field} ${direction}`;
      }
    }
  }

  // ─── CONTAR TOTAL ──────────────────────────────────────────────────────────
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM products p ${where}`,
    params,
  );

  // ─── QUERY PRINCIPAL ──────────────────────────────────────────────────────
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria,
            b.nombre as marca,
            (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // ─── ADJUNTAR IMÁGENES ──────────────────────────────────────────────────
  if (rows.length > 0) {
    const productIds = rows.map((r) => r.id);
    const [allImages] = await pool.query(
      `SELECT pi.product_id, pi.id, pi.url, pi.variant_id, pi.es_principal, pi.orden, pi.alt_text,
          JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) as variant_color
   FROM product_images pi
   LEFT JOIN product_variants pv ON pi.variant_id = pv.id
   WHERE pi.product_id IN (?)
   ORDER BY pi.product_id, pi.variant_id IS NULL DESC, pi.variant_id, pi.orden`,
      [productIds],
    );
    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push(img);
    });
    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return { rows, total };
};

// ─── OBTENER PRODUCTOS DESTACADOS ──────────────────────────────────────────
export const getFeatured = async (limit = 12) => {
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria,
            b.nombre as marca,
            (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.estado = 'activo'
       AND p.es_destacado = 1
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit],
  );

  if (rows.length > 0) {
    const productIds = rows.map((r) => r.id);
    const [allImages] = await pool.query(
      `SELECT product_id, id, url, variant_id, es_principal, orden, alt_text
       FROM product_images
       WHERE product_id IN (?)
       ORDER BY product_id, variant_id IS NULL DESC, variant_id, orden`,
      [productIds],
    );
    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push(img);
    });
    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return rows;
};

// ─── OBTENER PRODUCTOS POR ID ──────────────────────────────────────────────
export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria,
            b.nombre as marca,
            (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.id = ?`,
    [id],
  );

  if (rows.length === 0) return null;

  const product = rows[0];

  // ─── Obtener imágenes ──────────────────────────────────────────────────
  const [images] = await pool.query(
    `SELECT id, url, variant_id, es_principal, orden, alt_text
     FROM product_images
     WHERE product_id = ?
     ORDER BY variant_id IS NULL DESC, variant_id, orden`,
    [id],
  );
  product.images = images;

  // ─── Obtener variantes ──────────────────────────────────────────────────
  const [variants] = await pool.query(
    `SELECT id, 
            sku_variante, 
            opciones, 
            precio_extra, 
            stock, 
            imagen_url,
            activo
     FROM product_variants
     WHERE product_id = ?`,
    [id],
  );
  product.variants = variants;

  return product;
};

// ─── OBTENER POR SLUG ──────────────────────────────────────────────────────
export const findBySlug = async (slug) => {
  const [rows] = await pool.query("SELECT * FROM products WHERE slug = ?", [
    slug,
  ]);
  return rows[0] || null;
};

// ─── OBTENER PRODUCTOS RELACIONADOS ────────────────────────────────────────
export const getRelated = async (productId, categoryId, limit = 8) => {
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria,
            b.nombre as marca,
            (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.id != ?
       AND p.category_id = ?
       AND p.estado = 'activo'
     ORDER BY p.ventas_count DESC, p.rating_promedio DESC
     LIMIT ?`,
    [productId, categoryId, limit],
  );

  if (rows.length > 0) {
    const productIds = rows.map((r) => r.id);
    const [allImages] = await pool.query(
      `SELECT product_id, id, url, variant_id, es_principal, orden, alt_text
       FROM product_images
       WHERE product_id IN (?)
       ORDER BY product_id, variant_id IS NULL DESC, variant_id, orden`,
      [productIds],
    );
    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push(img);
    });
    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return rows;
};

// ─── OBTENER OPCIONES DE FILTRO ─────────────────────────────────────────────
export const getFilterOptions = async () => {
  // Marcas: solo productos activos
  const [brands] = await pool.query(`
    SELECT DISTINCT b.id, b.nombre
    FROM brands b
    INNER JOIN products p ON p.brand_id = b.id
    WHERE p.estado = 'activo'
    ORDER BY b.nombre
  `);

  // Tallas: solo variantes activas de productos activos
  const [tallasRaw] = await pool.query(`
    SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Talla')) as talla
    FROM product_variants pv
    INNER JOIN products p ON p.id = pv.product_id
    WHERE pv.activo = 1
      AND p.estado = 'activo'
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Talla')) IS NOT NULL
  `);
  const tallas = tallasRaw.map((row) => row.talla).filter(Boolean);

  // Colores: solo variantes activas de productos activos
  const [coloresRaw] = await pool.query(`
    SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) as color
    FROM product_variants pv
    INNER JOIN products p ON p.id = pv.product_id
    WHERE pv.activo = 1
      AND p.estado = 'activo'
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) IS NOT NULL
  `);
  const colores = coloresRaw.map((row) => row.color).filter(Boolean);

  return {
    marcas: brands,
    tallas,
    colores,
  };
};

// ─── CREAR PRODUCTO ──────────────────────────────────────────────────────────
export const create = async (data) => {
  const {
    category_id,
    brand_id,
    nombre,
    slug,
    descripcion,
    descripcion_corta,
    precio_base,
    precio_oferta,
    porcentaje_desc,
    sku,
    stock_total,
    peso_kg,
    dimensiones,
    tags,
    estado = "borrador",
    es_destacado = 0,
    es_nuevo = 0,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO products (
      category_id, brand_id, nombre, slug, descripcion, descripcion_corta,
      precio_base, precio_oferta, porcentaje_desc, sku, stock_total,
      peso_kg, dimensiones, tags, estado, es_destacado, es_nuevo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category_id,
      brand_id,
      nombre,
      slug,
      descripcion,
      descripcion_corta,
      precio_base,
      precio_oferta,
      porcentaje_desc,
      sku,
      stock_total,
      peso_kg,
      dimensiones,
      tags,
      estado,
      es_destacado,
      es_nuevo,
    ],
  );

  return result.insertId;
};

// ─── ACTUALIZAR PRODUCTO ────────────────────────────────────────────────────
export const update = async (id, data) => {
  const fields = [];
  const values = [];

  const allowedFields = [
    "category_id",
    "brand_id",
    "nombre",
    "slug",
    "descripcion",
    "descripcion_corta",
    "precio_base",
    "precio_oferta",
    "porcentaje_desc",
    "sku",
    "stock_total",
    "peso_kg",
    "dimensiones",
    "tags",
    "estado",
    "es_destacado",
    "es_nuevo",
  ];

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return true;

  values.push(id);
  const [result] = await pool.query(
    `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );

  return result.affectedRows > 0;
};

// ─── ELIMINAR PRODUCTO ──────────────────────────────────────────────────────
export const remove = async (id) => {
  await pool.query("DELETE FROM product_images WHERE product_id = ?", [id]);
  await pool.query("DELETE FROM product_variants WHERE product_id = ?", [id]);

  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const updateStock = async (productId, cantidad, conn) => {
  const db = conn || pool;
  const [result] = await db.query(
    "UPDATE products SET stock_total = stock_total - ? WHERE id = ? AND stock_total >= ?",
    [cantidad, productId, cantidad],
  );
  return result.affectedRows > 0;
};
// ── Reembolso ─────────────────────────────────────────────
export const refund = async (req, res, next) => {
  try {
    const { charge_id, order_id, amount, reason } = req.body;

    if (!charge_id) throw new AppError("Falta el charge_id a reembolsar", 400);
    if (!order_id) throw new AppError("Falta el order_id", 400);

    const order = await orderRepo.findById(order_id);
    if (!order) throw new AppError("Pedido no encontrado", 404);

    // Monto en céntimos — si no se especifica, reembolsa el total del pedido
    const refundAmount = amount
      ? Math.round(Number(amount) * 100)
      : Math.round(Number(order.total) * 100);

    const validReasons = [
      "solicitud_comprador",
      "duplicado",
      "fraudulento",
      "otro",
    ];
    const refundReason = validReasons.includes(reason)
      ? reason
      : "solicitud_comprador";

    console.log("📤 Enviando reembolso a Culqi:", {
      charge_id,
      amount: refundAmount,
      reason: refundReason,
    });

    const { data: refundData } = await culqi.post("/refunds", {
      charge_id,
      amount: refundAmount,
      reason: refundReason,
    });

    console.log(
      "📥 Respuesta de Culqi (reembolso):",
      JSON.stringify(refundData, null, 2),
    );

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await paymentRepo.updateStatus(
        order_id,
        "reembolsado",
        refundData.id,
        refundData,
        conn,
      );

      await orderRepo.updateStatus(
        order_id,
        "reembolsado",
        "Reembolso procesado",
        req.user.id,
        conn,
      );

      await conn.commit();
    } catch (dbError) {
      await conn.rollback();
      throw dbError;
    } finally {
      conn.release();
    }

    success(
      res,
      { refund_id: refundData.id },
      "Reembolso procesado exitosamente",
    );
  } catch (err) {
    if (err.response?.data) {
      console.error(
        "❌ Error Culqi (reembolso):",
        JSON.stringify(err.response.data, null, 2),
      );
      return error(
        res,
        err.response.data.user_message ||
          err.response.data.merchant_message ||
          "No se pudo procesar el reembolso",
        400,
      );
    }
    next(err);
  }
};
