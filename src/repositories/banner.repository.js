import { pool } from "../config/database.js";

// ─── Público: banners activos y vigentes, por tipo ────────────────────────
export const getActive = async (tipo) => {
  const [rows] = await pool.query(
    `SELECT * FROM banners
     WHERE activo = 1
       AND tipo = ?
       AND (fecha_inicio IS NULL OR fecha_inicio <= NOW())
       AND (fecha_fin IS NULL OR fecha_fin >= NOW())
     ORDER BY orden ASC, id ASC`,
    [tipo],
  );
  return rows;
};

// ─── Admin: todos los banners (sin filtro de vigencia/activo) ─────────────
export const getAll = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM banners ORDER BY tipo, orden ASC, id ASC",
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM banners WHERE id = ?", [id]);
  return rows[0] || null;
};

export const create = async (data) => {
  const {
    titulo,
    subtitulo,
    tag,
    imagen_url,
    boton_texto,
    link,
    tipo,
    orden,
    activo,
    fecha_inicio,
    fecha_fin,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO banners
      (titulo, subtitulo, tag, imagen_url, boton_texto, link, tipo, orden, activo, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      titulo,
      subtitulo || null,
      tag || null,
      imagen_url,
      boton_texto || null,
      link || null,
      tipo || "hero",
      orden || 0,
      activo !== undefined ? activo : 1,
      fecha_inicio || null,
      fecha_fin || null,
    ],
  );
  return result.insertId;
};

export const update = async (id, data) => {
  const fields = [];
  const values = [];
  const allowed = [
    "titulo",
    "subtitulo",
    "tag",
    "imagen_url",
    "boton_texto",
    "link",
    "tipo",
    "orden",
    "activo",
    "fecha_inicio",
    "fecha_fin",
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) return true;

  values.push(id);
  const [result] = await pool.query(
    `UPDATE banners SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return result.affectedRows > 0;
};

export const remove = async (id) => {
  const [result] = await pool.query("DELETE FROM banners WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
