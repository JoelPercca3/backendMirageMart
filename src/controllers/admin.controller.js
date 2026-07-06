import { pool } from "../config/database.js";
import { success, created } from "../utils/response.js";
import { createNotification } from "../services/notification.service.js";
import * as contactRepo from "../repositories/contact.repository.js";
import * as libroSvc from "../services/libroReclamaciones.service.js";
import * as newsletterSvc from "../services/newsletter.service.js";

export const dashboard = async (req, res, next) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE rol='cliente') as total_clientes,
        (SELECT COUNT(*) FROM products WHERE estado='activo') as total_productos,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at)=CURDATE()) as pedidos_hoy,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE estado IN ('pagado','enviado','entregado') AND MONTH(created_at)=MONTH(NOW())) as ingresos_mes,
        (SELECT COUNT(*) FROM orders WHERE estado='pendiente') as pedidos_pendientes,
        (SELECT COUNT(*) FROM reviews WHERE aprobado=0) as reviews_pendientes
    `);
    success(res, totals);
  } catch (e) {
    next(e);
  }
};
export const salesStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as total_pedidos, SUM(total) as ingresos FROM orders WHERE estado NOT IN ('cancelado','reembolsado') AND created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY fecha`,
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const productStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id,p.nombre,p.ventas_count,p.stock_total,p.rating_promedio,COALESCE(p.precio_oferta,p.precio_base) as precio FROM products p WHERE p.estado='activo' ORDER BY p.ventas_count DESC LIMIT 20`,
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const userStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as nuevos_usuarios FROM users WHERE rol='cliente' AND created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY fecha`,
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const revenueStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT YEAR(created_at) as año, MONTH(created_at) as mes, SUM(total) as ingresos, COUNT(*) as pedidos FROM orders WHERE estado IN ('pagado','enviado','entregado') GROUP BY año, mes ORDER BY año DESC, mes DESC LIMIT 12`,
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};

// Cupones
export const getCoupons = async (req, res, next) => {
  try {
    const [r] = await pool.query("SELECT * FROM coupons ORDER BY id DESC");
    success(res, r);
  } catch (e) {
    next(e);
  }
};
export const createCoupon = async (req, res, next) => {
  try {
    const {
      codigo,
      descripcion,
      tipo_descuento,
      valor,
      minimo_compra,
      maximo_descuento,
      uso_maximo,
      solo_primer_pedido,
      starts_at,
      expires_at,
    } = req.body;
    const [r] = await pool.query(
      "INSERT INTO coupons (codigo,descripcion,tipo_descuento,valor,minimo_compra,maximo_descuento,uso_maximo,solo_primer_pedido,starts_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [
        codigo,
        descripcion || null,
        tipo_descuento,
        valor,
        minimo_compra || 0,
        maximo_descuento || null,
        uso_maximo || null,
        solo_primer_pedido ? 1 : 0,
        starts_at || null,
        expires_at || null,
      ],
    );
    created(res, { id: r.insertId }, "Cupón creado");
  } catch (e) {
    next(e);
  }
};
export const updateCoupon = async (req, res, next) => {
  try {
    const {
      descripcion,
      valor,
      minimo_compra,
      uso_maximo,
      activo,
      expires_at,
    } = req.body;
    await pool.query(
      "UPDATE coupons SET descripcion=?,valor=?,minimo_compra=?,uso_maximo=?,activo=?,expires_at=? WHERE id=?",
      [
        descripcion || null,
        valor,
        minimo_compra || 0,
        uso_maximo || null,
        activo ?? 1,
        expires_at || null,
        req.params.id,
      ],
    );
    success(res, null, "Cupón actualizado");
  } catch (e) {
    next(e);
  }
};
export const deleteCoupon = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM coupons WHERE id=?", [req.params.id]);
    success(res, null, "Cupón eliminado");
  } catch (e) {
    next(e);
  }
};

// Productos
export const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;

    // En lugar de eliminar, solo desactivamos el producto
    await pool.query(
      "UPDATE products SET estado = 'inactivo', activo = 0 WHERE id = ?",
      [productId],
    );

    res.json({ ok: true, message: "Producto desactivado correctamente" });
  } catch (e) {
    console.error("Error al desactivar producto:", e);
    next(e);
  }
};
// Banners
export const getBanners = async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "SELECT * FROM banners ORDER BY posicion,orden",
    );
    success(res, r);
  } catch (e) {
    next(e);
  }
};
export const createBanner = async (req, res, next) => {
  try {
    const {
      titulo,
      subtitulo,
      imagen_url,
      imagen_mobile_url,
      url_destino,
      posicion,
      orden,
    } = req.body;
    const [r] = await pool.query(
      "INSERT INTO banners (titulo,subtitulo,imagen_url,imagen_mobile_url,url_destino,posicion,orden) VALUES(?,?,?,?,?,?,?)",
      [
        titulo || null,
        subtitulo || null,
        imagen_url,
        imagen_mobile_url || null,
        url_destino || null,
        posicion || "hero",
        orden || 0,
      ],
    );
    created(res, { id: r.insertId }, "Banner creado");
  } catch (e) {
    next(e);
  }
};
export const updateBanner = async (req, res, next) => {
  try {
    const {
      titulo,
      subtitulo,
      imagen_url,
      url_destino,
      posicion,
      orden,
      activo,
    } = req.body;
    await pool.query(
      "UPDATE banners SET titulo=?,subtitulo=?,imagen_url=?,url_destino=?,posicion=?,orden=?,activo=? WHERE id=?",
      [
        titulo || null,
        subtitulo || null,
        imagen_url,
        url_destino || null,
        posicion || "hero",
        orden || 0,
        activo ?? 1,
        req.params.id,
      ],
    );
    success(res, null, "Banner actualizado");
  } catch (e) {
    next(e);
  }
};
export const deleteBanner = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM banners WHERE id=?", [req.params.id]);
    success(res, null, "Banner eliminado");
  } catch (e) {
    next(e);
  }
};

// Settings
export const getSettings = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT clave,valor,tipo,descripcion FROM settings",
    );
    const settings = {};
    rows.forEach((r) => {
      settings[r.clave] =
        r.tipo === "json"
          ? JSON.parse(r.valor)
          : r.tipo === "numero"
            ? Number(r.valor)
            : r.tipo === "booleano"
              ? r.valor === "1"
              : r.valor;
    });
    success(res, settings);
  } catch (e) {
    next(e);
  }
};
export const updateSettings = async (req, res, next) => {
  try {
    for (const [clave, valor] of Object.entries(req.body))
      await pool.query("UPDATE settings SET valor=? WHERE clave=?", [
        typeof valor === "object" ? JSON.stringify(valor) : String(valor),
        clave,
      ]);
    success(res, null, "Configuración actualizada");
  } catch (e) {
    next(e);
  }
};

// Shipping
export const getShippingMethods = async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "SELECT * FROM shipping_methods ORDER BY precio",
    );
    success(res, r);
  } catch (e) {
    next(e);
  }
};
export const createShippingMethod = async (req, res, next) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      precio_por_kg,
      dias_entrega_min,
      dias_entrega_max,
    } = req.body;
    const [r] = await pool.query(
      "INSERT INTO shipping_methods (nombre,descripcion,precio,precio_por_kg,dias_entrega_min,dias_entrega_max) VALUES(?,?,?,?,?,?)",
      [
        nombre,
        descripcion || null,
        precio,
        precio_por_kg || 0,
        dias_entrega_min || 1,
        dias_entrega_max || 7,
      ],
    );
    created(res, { id: r.insertId }, "Método de envío creado");
  } catch (e) {
    next(e);
  }
};
export const updateShippingMethod = async (req, res, next) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      precio_por_kg,
      dias_entrega_min,
      dias_entrega_max,
      activo,
    } = req.body;
    await pool.query(
      "UPDATE shipping_methods SET nombre=?,descripcion=?,precio=?,precio_por_kg=?,dias_entrega_min=?,dias_entrega_max=?,activo=? WHERE id=?",
      [
        nombre,
        descripcion || null,
        precio,
        precio_por_kg || 0,
        dias_entrega_min || 1,
        dias_entrega_max || 7,
        activo ?? 1,
        req.params.id,
      ],
    );
    success(res, null, "Método de envío actualizado");
  } catch (e) {
    next(e);
  }
};
// Agrega esto al final de tu admin.controller.js
export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const rol = req.query.rol || "";

    let query =
      "SELECT id, nombre, email, telefono, rol, activo, created_at FROM users WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (rol) {
      query += " AND rol = ?";
      params.push(rol);
    }

    const [rows] = await pool.query(
      query + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [...params, limit, offset],
    );
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE 1=1" +
        (search ? " AND (nombre LIKE ? OR email LIKE ?)" : "") +
        (rol ? " AND rol = ?" : ""),
      params,
    );

    res.json({
      ok: true,
      data: rows,
      meta: {
        total: countResult[0].total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, telefono, rol, activo, created_at FROM users WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado" });
    }
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
};

export const changeUserStatus = async (req, res, next) => {
  try {
    const { activo } = req.body;
    await pool.query("UPDATE users SET activo = ? WHERE id = ?", [
      activo ? 1 : 0,
      req.params.id,
    ]);
    res.json({ ok: true, message: "Estado actualizado" });
  } catch (e) {
    next(e);
  }
};
// Categorías
export const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories ORDER BY nombre");
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
};
const generateSlug = (texto) => {
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]+/g, "-") // Reemplazar espacios con -
    .replace(/^-|-$/g, ""); // Eliminar guiones al inicio y final
};

export const createCategory = async (req, res, next) => {
  try {
    const { nombre, parent_id, descripcion, imagen_url, orden, activo } =
      req.body;

    console.log("📁 Creando categoría:", { nombre, parent_id }); // Debug

    // ✅ Generar slug
    let slug = generateSlug(nombre);

    // ✅ Verificar si el slug ya existe
    const [existing] = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [slug],
    );

    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // ✅ Insertar categoría
    const [r] = await pool.query(
      `INSERT INTO categories (parent_id, nombre, slug, descripcion, imagen_url, orden, activo) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parent_id || null,
        nombre,
        slug,
        descripcion || null,
        imagen_url || null,
        orden || 0,
        activo ?? 1,
      ],
    );

    res.json({
      ok: true,
      data: { id: r.insertId },
      message: "Categoría creada",
    });
  } catch (e) {
    console.error("❌ Error en createCategory:", e);
    next(e);
  }
};
export const updateCategory = async (req, res, next) => {
  try {
    const { nombre, parent_id, descripcion, imagen_url, orden, activo } =
      req.body;

    await pool.query(
      "UPDATE categories SET nombre = ?, parent_id = ?, descripcion = ?, imagen_url = ?, orden = ?, activo = ? WHERE id = ?",
      [
        nombre,
        parent_id || null,
        descripcion || null,
        imagen_url || null,
        orden || 0,
        activo ?? 1,
        req.params.id,
      ],
    );

    res.json({ ok: true, message: "Categoría actualizada" });
  } catch (e) {
    next(e);
  }
};
export const deleteCategory = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ ok: true, message: "Categoría eliminada" });
  } catch (e) {
    next(e);
  }
};
// Reseñas
export const getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const aprobado =
      req.query.aprobado === undefined ? null : parseInt(req.query.aprobado);

    let query = `
      SELECT r.*, u.nombre as usuario_nombre, p.nombre as producto_nombre 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (aprobado !== null) {
      query += " AND r.aprobado = ?";
      params.push(aprobado);
    }

    query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";

    const [rows] = await pool.query(query, [...params, limit, offset]);
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM reviews" +
        (aprobado !== null ? " WHERE aprobado = ?" : ""),
      aprobado !== null ? [aprobado] : [],
    );

    res.json({
      ok: true,
      data: rows,
      meta: {
        total: countResult[0].total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};
export const approveReview = async (req, res, next) => {
  try {
    // Obtener product_id antes de aprobar
    const [[rev]] = await pool.query(
      "SELECT product_id FROM reviews WHERE id = ?",
      [req.params.id],
    );

    if (!rev) {
      return res
        .status(404)
        .json({ ok: false, message: "Reseña no encontrada" });
    }

    // Aprobar la reseña
    await pool.query("UPDATE reviews SET aprobado = 1 WHERE id = ?", [
      req.params.id,
    ]);

    // ✅ Actualizar rating del producto
    await pool.query(
      `UPDATE products 
       SET 
         rating_promedio = (SELECT AVG(r.calificacion) FROM reviews r WHERE r.product_id = ? AND r.aprobado = 1),
         rating_count    = (SELECT COUNT(*)             FROM reviews r WHERE r.product_id = ? AND r.aprobado = 1)
       WHERE id = ?`,
      [rev.product_id, rev.product_id, rev.product_id],
    );

    res.json({ ok: true, message: "Reseña aprobada" });
  } catch (e) {
    next(e);
  }
};
export const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let query = `
      SELECT p.*, c.nombre as categoria_nombre 
      FROM products p
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      query + " ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
      [...params, limit, offset],
    );
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM products",
    );

    res.json({
      ok: true,
      data: rows,
      meta: {
        total: countResult[0].total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const {
      nombre,
      descripcion,
      precio_base,
      precio_oferta,
      stock_total,
      categoria_id,
      estado,
    } = req.body;
    await pool.query(
      "UPDATE products SET nombre = ?, descripcion = ?, precio_base = ?, precio_oferta = ?, stock_total = ?, categoria_id = ?, estado = ? WHERE id = ?",
      [
        nombre,
        descripcion,
        precio_base,
        precio_oferta,
        stock_total,
        categoria_id,
        estado,
        req.params.id,
      ],
    );
    res.json({ ok: true, message: "Producto actualizado" });
  } catch (e) {
    next(e);
  }
};

export const sendPromo = async (req, res, next) => {
  try {
    const { titulo, mensaje, url_accion, tipo = "promo" } = req.body;

    if (!titulo || !mensaje) {
      return res
        .status(400)
        .json({ ok: false, message: "Título y mensaje son requeridos" });
    }

    // Obtener todos los usuarios activos (clientes)
    const [users] = await pool.query(
      "SELECT id FROM users WHERE rol = 'cliente' AND activo = 1",
    );

    if (!users.length) {
      return res
        .status(400)
        .json({ ok: false, message: "No hay usuarios activos" });
    }

    // Enviar notificación a cada usuario
    await Promise.all(
      users.map((user) =>
        createNotification(user.id, titulo, mensaje, tipo, url_accion || null),
      ),
    );

    res.json({
      ok: true,
      message: `Promoción enviada a ${users.length} usuarios`,
      data: { total: users.length },
    });
  } catch (e) {
    next(e);
  }
};

// ── Mensajes de contacto ──────────────────────────────────────────────────
export const getContactMessages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const leido = req.query.leido; // "0" | "1" | undefined (todos)

    const { rows, total } = await contactRepo.getAll({
      limit,
      offset,
      search,
      leido,
    });

    res.json({
      ok: true,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const markContactMessageRead = async (req, res, next) => {
  try {
    const { leido } = req.body;
    await contactRepo.markAsRead(req.params.id, leido);
    res.json({ ok: true, message: "Actualizado" });
  } catch (e) {
    next(e);
  }
};

// ── Libro de reclamaciones ─────────────────────────────────────────────────
export const getLibroReclamaciones = async (req, res, next) => {
  try {
    const result = await libroSvc.getAll(req.query);
    res.json({
      ok: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const getLibroReclamacionItem = async (req, res, next) => {
  try {
    const record = await libroSvc.getOne(Number(req.params.id));
    success(res, record);
  } catch (e) {
    next(e);
  }
};

export const responderLibroReclamacion = async (req, res, next) => {
  try {
    const { respuesta } = req.body;
    if (!respuesta || respuesta.trim().length < 5) {
      return res
        .status(422)
        .json({ ok: false, message: "La respuesta es muy corta" });
    }
    const updated = await libroSvc.respond(Number(req.params.id), respuesta);
    success(res, updated, "Respuesta enviada al consumidor");
  } catch (e) {
    next(e);
  }
};

// ── Newsletter ──────────────────────────────────────────────────────────────
export const getNewsletterSubscribers = async (req, res, next) => {
  try {
    const result = await newsletterSvc.getAll(req.query);
    res.json({
      ok: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const setNewsletterSubscriberStatus = async (req, res, next) => {
  try {
    const { activo } = req.body;
    await newsletterSvc.setActivo(req.params.id, activo);
    res.json({ ok: true, message: "Actualizado" });
  } catch (e) {
    next(e);
  }
};

// ── Marcas ──────────────────────────────────────────────────────────────────
export const getBrands = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM brands ORDER BY nombre");
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res
        .status(422)
        .json({ ok: false, message: "El nombre de la marca es requerido" });
    }

    const [existing] = await pool.query(
      "SELECT id, nombre FROM brands WHERE nombre = ?",
      [nombre.trim()],
    );
    if (existing.length > 0) {
      return res.json({
        ok: true,
        data: existing[0],
        message: "La marca ya existía",
      });
    }

    const [r] = await pool.query("INSERT INTO brands (nombre) VALUES (?)", [
      nombre.trim(),
    ]);
    res.json({
      ok: true,
      data: { id: r.insertId, nombre: nombre.trim() },
      message: "Marca creada",
    });
  } catch (e) {
    next(e);
  }
};
