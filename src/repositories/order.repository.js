import { pool } from "../config/database.js";

export const create = async (orderData, items, conn) => {
  const {
    user_id,
    address_id,
    shipping_method_id,
    coupon_id,
    codigo_orden,
    subtotal,
    descuento,
    costo_envio,
    total,
    notas_cliente,
    ip_cliente,
  } = orderData;

  const [result] = await conn.query(
    `INSERT INTO orders (user_id, address_id, shipping_method_id, coupon_id, codigo_orden,
      subtotal, descuento, costo_envio, total, notas_cliente, ip_cliente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      address_id,
      shipping_method_id,
      coupon_id || null,
      codigo_orden,
      subtotal,
      descuento,
      costo_envio,
      total,
      notas_cliente || null,
      ip_cliente || null,
    ],
  );
  const orderId = result.insertId;

  for (const item of items) {
    await conn.query(
      `INSERT INTO order_items (order_id, product_id, variant_id, nombre_producto,
        sku_item, opciones_variante, precio_unitario, cantidad, descuento_item, subtotal, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        item.product_id,
        item.variant_id || null,
        item.nombre,
        item.sku || null,
        item.opciones ? JSON.stringify(item.opciones) : null,
        item.precio_unitario,
        item.cantidad,
        item.descuento || 0,
        item.subtotal,
        item.imagen || null,
      ],
    );
  }

  await conn.query(
    "INSERT INTO order_status_history (order_id, estado) VALUES (?, ?)",
    [orderId, "pendiente"],
  );
  return orderId;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT o.*, u.nombre as cliente_nombre, u.email as cliente_email,
            sm.nombre as metodo_envio, sm.dias_entrega_min, sm.dias_entrega_max,
            a.calle, a.ciudad, a.departamento, a.pais, a.nombre_destinatario
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN shipping_methods sm ON o.shipping_method_id = sm.id
     LEFT JOIN addresses a ON o.address_id = a.id
     WHERE o.id = ? LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;

  const [items] = await pool.query(
    `SELECT oi.*, p.slug as product_slug FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
    [id],
  );
  const [history] = await pool.query(
    "SELECT estado, comentario, created_at FROM order_status_history WHERE order_id = ? ORDER BY id",
    [id],
  );
  const [payment] = await pool.query(
    "SELECT metodo, estado, referencia_externa, monto, paid_at FROM payments WHERE order_id = ? LIMIT 1",
    [id],
  );
  return { ...rows[0], items, history, payment: payment[0] || null };
};

export const findByUser = async (userId, { limit, offset }) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM orders WHERE user_id = ?",
    [userId],
  );
  const [rows] = await pool.query(
    `SELECT o.id, o.codigo_orden, o.estado, o.total, o.created_at, COUNT(oi.id) as total_items
     FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ? GROUP BY o.id ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return { rows, total };
};

export const getAll = async ({ limit, offset, estado, search }) => {
  const params = [];
  let where = "WHERE 1=1";
  if (estado) {
    where += " AND o.estado = ?";
    params.push(estado);
  }
  if (search) {
    where += " AND (o.codigo_orden LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM orders o JOIN users u ON o.user_id = u.id ${where}`,
    params,
  );
  const [rows] = await pool.query(
    `SELECT o.id, o.codigo_orden, o.estado, o.total, o.created_at, u.nombre as cliente, u.email
     FROM orders o JOIN users u ON o.user_id = u.id
     ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { rows, total };
};

export const updateStatus = async (
  id,
  estado,
  comentario,
  adminId,
  conn = pool,
) => {
  await conn.query("UPDATE orders SET estado = ? WHERE id = ?", [estado, id]);
  await conn.query(
    "INSERT INTO order_status_history (order_id, estado, comentario, created_by) VALUES (?, ?, ?, ?)",
    [id, estado, comentario || null, adminId || null],
  );
};

export const updateTracking = async (id, tracking_number) => {
  await pool.query(
    "UPDATE orders SET tracking_number = ?, fecha_envio = NOW() WHERE id = ?",
    [tracking_number, id],
  );
};
