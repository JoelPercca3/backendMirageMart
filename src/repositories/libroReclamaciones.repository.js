import { pool } from "../config/database.js";

export const create = async (data) => {
  // ⚠️ codigo es NOT NULL + UNIQUE en la tabla, pero el código definitivo
  // (LR-2026-000123) se arma DESPUÉS del insert porque depende del id
  // autoincremental. Por eso insertamos con un valor temporal único, y el
  // servicio lo reemplaza enseguida con setCodigo() una vez tiene el id.
  const tempCodigo = `TEMP-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  const [result] = await pool.query(
    `INSERT INTO libro_reclamaciones
      (codigo, tipo, nombre_completo, tipo_documento, numero_documento,
       email, telefono, domicilio, numero_pedido, bien_contratado, monto_reclamado,
       detalle, pedido_consumidor, es_menor_edad, nombre_apoderado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tempCodigo,
      data.tipo,
      data.nombre_completo,
      data.tipo_documento || null,
      data.numero_documento || null,
      data.email,
      data.telefono || null,
      data.domicilio || null,
      data.numero_pedido || null,
      data.bien_contratado || null,
      data.monto_reclamado || null,
      data.detalle,
      data.pedido_consumidor,
      data.es_menor_edad ? 1 : 0,
      data.nombre_apoderado || null,
    ],
  );
  return result.insertId;
};

// El código se genera después del insert, usando el propio id autoincremental
// (evita condiciones de carrera de un contador manual concurrente).
export const setCodigo = async (id, codigo) => {
  await pool.query("UPDATE libro_reclamaciones SET codigo = ? WHERE id = ?", [
    codigo,
    id,
  ]);
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM libro_reclamaciones WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

export const findByCodigoAndEmail = async (codigo, email) => {
  const [rows] = await pool.query(
    "SELECT * FROM libro_reclamaciones WHERE codigo = ? AND email = ?",
    [codigo, email],
  );
  return rows[0] || null;
};

export const getAll = async ({ limit, offset, search, estado, tipo }) => {
  let where = "WHERE 1=1";
  const params = [];

  if (search) {
    where += " AND (nombre_completo LIKE ? OR email LIKE ? OR codigo LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (estado === "pendiente" || estado === "respondido") {
    where += " AND estado = ?";
    params.push(estado);
  }
  if (tipo === "reclamo" || tipo === "queja") {
    where += " AND tipo = ?";
    params.push(tipo);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM libro_reclamaciones ${where}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT * FROM libro_reclamaciones ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
};

export const respond = async (id, respuesta) => {
  await pool.query(
    `UPDATE libro_reclamaciones
     SET respuesta = ?, estado = 'respondido', respondido_at = NOW()
     WHERE id = ?`,
    [respuesta, id],
  );
};
