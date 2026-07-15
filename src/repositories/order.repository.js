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

  const datos = {
    user_id: Number(user_id) || 0,
    address_id: Number(address_id) || 0,
    shipping_method_id: Number(shipping_method_id) || 0,
    coupon_id: coupon_id ? Number(coupon_id) : null,
    codigo_orden,
    subtotal: Number(subtotal) || 0,
    descuento: Number(descuento) || 0,
    costo_envio: Number(costo_envio) || 0,
    total: Number(total) || 0,
    notas_cliente,
    ip_cliente,
  };

  const [result] = await conn.query(
    `INSERT INTO orders (
      user_id, address_id, shipping_method_id, coupon_id,
      codigo_orden, subtotal, descuento, costo_envio, total,
      notas_cliente, ip_cliente
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.user_id,
      datos.address_id,
      datos.shipping_method_id,
      datos.coupon_id,
      datos.codigo_orden,
      datos.subtotal,
      datos.descuento,
      datos.costo_envio,
      datos.total,
      datos.notas_cliente || null,
      datos.ip_cliente || null,
    ],
  );

  const orderId = result.insertId;

  for (const item of items) {
    await conn.query(
      `INSERT INTO order_items (
        order_id, product_id, variant_id, nombre_producto,
        sku_item, opciones_variante, precio_unitario, cantidad,
        descuento_item, subtotal, imagen_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export const findById = async (id, userId = null) => {
  const [rows] = await pool.query(
    `SELECT o.*,
            u.nombre           AS cliente_nombre,
            u.email            AS cliente_email,
            u.telefono         AS cliente_telefono,
            u.tipo_documento   AS cliente_tipo_documento,
            u.numero_documento AS cliente_numero_documento,
            sm.nombre AS metodo_envio,
            sm.dias_entrega_min,
            sm.dias_entrega_max,
            sm.es_recojo_tienda,  -- ✅ AGREGAR ESTA LÍNEA
            a.nombre_destinatario,
            a.calle,
            a.referencia,
            a.distrito,
            a.provincia,
            a.departamento,
            a.ciudad,
            a.codigo_postal,
            a.pais,
            a.telefono_contacto
     FROM orders o
     JOIN  users            u  ON o.user_id           = u.id
     LEFT JOIN shipping_methods sm ON o.shipping_method_id = sm.id
     LEFT JOIN addresses        a  ON o.address_id         = a.id
     WHERE o.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) return null;

  const [items] = await pool.query(
    `SELECT oi.*,
            p.slug AS product_slug,
            p.nombre AS nombre_producto,
            CASE
              WHEN ? IS NOT NULL THEN (
                SELECT COUNT(*) > 0
                FROM reviews
                WHERE product_id = oi.product_id
                  AND user_id    = ?
                  AND order_id   = oi.order_id
              )
              ELSE 0
            END AS has_reviewed
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [userId, userId, id],
  );

  const [history] = await pool.query(
    `SELECT estado, comentario, created_at
     FROM order_status_history
     WHERE order_id = ?
     ORDER BY id ASC`,
    [id],
  );

  const [payments] = await pool.query(
    `SELECT p.metodo, p.estado, p.referencia_externa, p.monto, p.paid_at, p.respuesta_pasarela,
          COALESCE((
            SELECT SUM(monto) FROM refunds WHERE payment_id = p.id
          ), 0) AS monto_reembolsado
   FROM payments p
   WHERE p.order_id = ?
   LIMIT 1`,
    [id],
  );

  const [refunds] = await pool.query(
    `SELECT id, refund_id, monto, reason, status, respuesta_pasarela, fecha_reembolso, created_at
   FROM refunds
   WHERE order_id = ?
   ORDER BY id ASC`,
    [id],
  );

  const [refundRequestRows] = await pool.query(
    `SELECT id, motivo, comentario, monto_solicitado, estado, respuesta_admin, created_at, reviewed_at
     FROM refund_requests 
     WHERE order_id = ? 
     ORDER BY id DESC 
     LIMIT 1`,
    [id],
  );

  // 🔥 NUEVO: Consulta para obtener todas las solicitudes de devolución por ítem
  const [returnRequestRows] = await pool.query(
    `SELECT id, order_item_id, motivo, comentario, cantidad, fotos, monto_reembolso,
            estado, respuesta_admin, instrucciones_admin, created_at
     FROM return_requests 
     WHERE order_id = ?`,
    [id],
  );

  // 🔥 NUEVO: Agrupar las solicitudes de devolución por order_item_id
  const returnRequestsByItem = {};
  returnRequestRows.forEach((rr) => {
    returnRequestsByItem[rr.order_item_id] = rr;
  });

  // 🔥 NUEVO: Asignar a cada item su solicitud de devolución correspondiente (o null)
  items.forEach((item) => {
    item.return_request = returnRequestsByItem[item.id] || null;
  });

  const payment = payments[0] || null;

  const necesitaReembolso =
    rows[0].estado === "cancelado" &&
    payment?.estado === "completado" &&
    Number(payment?.monto_reembolsado || 0) < Number(rows[0].total);

  return {
    ...rows[0],
    items,
    history,
    payment,
    refunds,
    necesita_reembolso: necesitaReembolso,
    refund_request: refundRequestRows[0] || null,
  };
};

export const findByUser = async (userId, { limit, offset }) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM orders WHERE user_id = ?",
    [userId],
  );

  const [rows] = await pool.query(
    `SELECT o.id, o.codigo_orden, o.estado, o.total, o.created_at,
            COUNT(oi.id) AS total_items
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.id DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );

  for (const order of rows) {
    const [items] = await pool.query(
      `SELECT oi.*,
              p.id   AS product_id,
              p.nombre AS product_name,
              p.slug   AS product_slug,
              (SELECT COUNT(*) > 0
               FROM reviews
               WHERE product_id = oi.product_id
                 AND user_id    = ?
                 AND order_id   = oi.order_id) AS has_reviewed
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [userId, order.id],
    );
    order.items = items;
  }

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
    `SELECT COUNT(*) AS total
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${where}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT o.id, o.codigo_orden, o.estado, o.total, o.created_at,
            u.nombre AS cliente, u.email
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${where}
     ORDER BY o.id DESC
     LIMIT ? OFFSET ?`,
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
    `INSERT INTO order_status_history (order_id, estado, comentario, created_by)
     VALUES (?, ?, ?, ?)`,
    [id, estado, comentario || null, adminId || null],
  );
};

export const updateTracking = async (
  id,
  tracking_number,
  courier,
  clave_recojo,
) => {
  await pool.query(
    "UPDATE orders SET tracking_number = ?, courier = ?, clave_recojo = ?, fecha_envio = NOW() WHERE id = ?",
    [tracking_number, courier, clave_recojo || null, id],
  );
};

// ✅ Fecha real de entrega — se usa para calcular la ventana de 7 días
// para solicitar devoluciones. Tomamos el registro más reciente con
// estado "entregado" del historial (no order_items ni orders.fecha_entrega
// directamente, para no depender de que ese campo se llene manualmente).
export const getFechaEntrega = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT created_at FROM order_status_history
     WHERE order_id = ? AND estado = 'entregado'
     ORDER BY id DESC LIMIT 1`,
    [orderId],
  );
  return rows[0]?.created_at || null;
};

// ✅ Pedidos "enviado" hace más de N días, que NO son recojo en tienda
// (esos los confirma el admin manualmente al entregar en persona)
export const findShippedOlderThan = async (days) => {
  const [rows] = await pool.query(
    `SELECT o.id, o.user_id, o.codigo_orden
     FROM orders o
     JOIN shipping_methods sm ON o.shipping_method_id = sm.id
     WHERE o.estado = 'enviado'
       AND sm.es_recojo_tienda = 0
       AND o.fecha_envio IS NOT NULL
       AND o.fecha_envio <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );
  return rows;
};
