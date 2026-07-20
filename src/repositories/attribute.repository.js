import { pool } from "../config/database.js";

// ─── CRUD de definiciones de atributos ─────────────────────────────────────
export const getAll = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM attribute_definitions ORDER BY nombre",
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM attribute_definitions WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

export const create = async ({ nombre, tipo, filtrable }) => {
  const [result] = await pool.query(
    "INSERT INTO attribute_definitions (nombre, tipo, filtrable) VALUES (?, ?, ?)",
    [nombre, tipo || "spec", filtrable !== undefined ? filtrable : 1],
  );
  return result.insertId;
};

export const update = async (id, { nombre, tipo, filtrable }) => {
  const fields = [];
  const values = [];
  if (nombre !== undefined) {
    fields.push("nombre = ?");
    values.push(nombre);
  }
  if (tipo !== undefined) {
    fields.push("tipo = ?");
    values.push(tipo);
  }
  if (filtrable !== undefined) {
    fields.push("filtrable = ?");
    values.push(filtrable);
  }
  if (fields.length === 0) return true;

  values.push(id);
  const [result] = await pool.query(
    `UPDATE attribute_definitions SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return result.affectedRows > 0;
};

export const remove = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM attribute_definitions WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

// ─── Asociación categoría ↔ atributos ──────────────────────────────────────
export const getByCategoryId = async (categoryId) => {
  const [rows] = await pool.query(
    `SELECT ad.id, ad.nombre, ad.tipo, ad.filtrable,
            ca.es_requerido, ca.orden
     FROM category_attributes ca
     JOIN attribute_definitions ad ON ad.id = ca.attribute_id
     WHERE ca.category_id = ?
     ORDER BY ca.orden, ad.nombre`,
    [categoryId],
  );
  return rows;
};

export const assignToCategory = async (
  categoryId,
  { attribute_id, es_requerido, orden },
) => {
  await pool.query(
    `INSERT INTO category_attributes (category_id, attribute_id, es_requerido, orden)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE es_requerido = VALUES(es_requerido), orden = VALUES(orden)`,
    [categoryId, attribute_id, es_requerido ? 1 : 0, orden || 0],
  );
};

export const removeFromCategory = async (categoryId, attributeId) => {
  const [result] = await pool.query(
    "DELETE FROM category_attributes WHERE category_id = ? AND attribute_id = ?",
    [categoryId, attributeId],
  );
  return result.affectedRows > 0;
};
