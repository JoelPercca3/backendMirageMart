import { pool } from "../config/database.js";

export const findByUserId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM email_verifications WHERE user_id = ?`,
    [userId],
  );
  return rows[0] || null;
};

export const create = async ({
  user_id,
  codigo,
  expira_en,
  reenvios_count,
  primer_envio_en,
  ultimo_envio_en,
}) => {
  await pool.query(
    `INSERT INTO email_verifications
       (user_id, codigo, intentos, expira_en, reenvios_count, primer_envio_en, ultimo_envio_en)
     VALUES (?, ?, 0, ?, ?, ?, ?)`,
    [
      user_id,
      codigo,
      expira_en,
      reenvios_count,
      primer_envio_en,
      ultimo_envio_en,
    ],
  );
};

export const updateForResend = async (
  userId,
  { codigo, expira_en, reenvios_count, primer_envio_en, ultimo_envio_en },
) => {
  await pool.query(
    `UPDATE email_verifications
       SET codigo = ?, intentos = 0, expira_en = ?, bloqueado_hasta = NULL,
           reenvios_count = ?, primer_envio_en = ?, ultimo_envio_en = ?
     WHERE user_id = ?`,
    [
      codigo,
      expira_en,
      reenvios_count,
      primer_envio_en,
      ultimo_envio_en,
      userId,
    ],
  );
};

export const incrementIntentos = async (userId) => {
  await pool.query(
    `UPDATE email_verifications SET intentos = intentos + 1 WHERE user_id = ?`,
    [userId],
  );
};

export const setBloqueado = async (userId, bloqueadoHasta) => {
  await pool.query(
    `UPDATE email_verifications SET bloqueado_hasta = ? WHERE user_id = ?`,
    [bloqueadoHasta, userId],
  );
};

export const deleteByUserId = async (userId) => {
  await pool.query(`DELETE FROM email_verifications WHERE user_id = ?`, [
    userId,
  ]);
};
