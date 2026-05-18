import { pool } from "../config/database.js";
import { success, created } from "../utils/response.js";

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
