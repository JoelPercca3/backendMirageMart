import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import * as userRepo from "../repositories/user.repository.js";
import { success, created, paginated, error } from "../utils/response.js";
import { getPagination } from "../utils/paginate.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { BCRYPT_ROUNDS } from "../config/constants.js";

export const getProfile = async (req, res, next) => {
  try {
    success(res, await userRepo.findById(req.user.id));
  } catch (e) {
    next(e);
  }
};
export const updateProfile = async (req, res, next) => {
  try {
    const { nombre, telefono, avatar_url } = req.body;
    await userRepo.update(req.user.id, { nombre, telefono, avatar_url });
    success(res, null, "Perfil actualizado");
  } catch (e) {
    next(e);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id],
    );
    if (!rows[0]) return error(res, "Usuario no encontrado", 404);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) throw new AppError("La contraseña actual es incorrecta", 400);
    await userRepo.update(req.user.id, {
      password_hash: await bcrypt.hash(new_password, BCRYPT_ROUNDS),
    });
    success(res, null, "Contraseña actualizada");
  } catch (e) {
    next(e);
  }
};

// Direcciones
export const getAddresses = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY es_predeterminada DESC, id DESC",
      [req.user.id],
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const addAddress = async (req, res, next) => {
  try {
    const {
      nombre_destinatario,
      calle,
      referencia,
      ciudad,
      departamento,
      provincia, // ← NUEVO
      distrito, // ← NUEVO
      codigo_postal,
      pais,
      telefono_contacto,
      es_predeterminada,
    } = req.body;

    if (es_predeterminada)
      await pool.query(
        "UPDATE addresses SET es_predeterminada = 0 WHERE user_id = ?",
        [req.user.id],
      );

    const [result] = await pool.query(
      `INSERT INTO addresses 
       (user_id, nombre_destinatario, calle, referencia, ciudad, 
        departamento, provincia, distrito, codigo_postal, pais, 
        telefono_contacto, es_predeterminada) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        nombre_destinatario,
        calle,
        referencia || null,
        ciudad || null,
        departamento || null,
        provincia || null, // ← NUEVO
        distrito || null, // ← NUEVO
        codigo_postal || null,
        pais || "Perú",
        telefono_contacto || null,
        es_predeterminada ? 1 : 0,
      ],
    );
    created(res, { id: result.insertId }, "Dirección agregada");
  } catch (e) {
    next(e);
  }
};
export const updateAddress = async (req, res, next) => {
  try {
    const {
      nombre_destinatario,
      calle,
      referencia,
      ciudad,
      departamento,
      provincia, // ← NUEVO
      distrito, // ← NUEVO
      codigo_postal,
      pais,
      telefono_contacto,
      es_predeterminada,
    } = req.body;

    // Si se marca como predeterminada, quitar de otras
    if (es_predeterminada) {
      await pool.query(
        "UPDATE addresses SET es_predeterminada = 0 WHERE user_id = ?",
        [req.user.id],
      );
    }

    await pool.query(
      `UPDATE addresses SET 
        nombre_destinatario = ?, 
        calle = ?, 
        referencia = ?, 
        ciudad = ?, 
        departamento = ?, 
        provincia = ?, 
        distrito = ?, 
        codigo_postal = ?, 
        pais = ?, 
        telefono_contacto = ?,
        es_predeterminada = ?
       WHERE id = ? AND user_id = ?`,
      [
        nombre_destinatario,
        calle,
        referencia || null,
        ciudad || null,
        departamento || null,
        provincia || null, // ← NUEVO
        distrito || null, // ← NUEVO
        codigo_postal || null,
        pais || "Perú",
        telefono_contacto || null,
        es_predeterminada ? 1 : 0,
        req.params.id,
        req.user.id,
      ],
    );
    success(res, null, "Dirección actualizada");
  } catch (e) {
    next(e);
  }
};
export const deleteAddress = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    success(res, null, "Dirección eliminada");
  } catch (e) {
    next(e);
  }
};
export const setDefaultAddress = async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE addresses SET es_predeterminada = 0 WHERE user_id = ?",
      [req.user.id],
    );
    await pool.query(
      "UPDATE addresses SET es_predeterminada = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    success(res, null, "Dirección predeterminada actualizada");
  } catch (e) {
    next(e);
  }
};

// Notificaciones
export const getNotifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      [req.user.id],
    );
    success(res, rows);
  } catch (e) {
    next(e);
  }
};
export const markAsRead = async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notifications SET leido = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    success(res, null, "Marcada como leída");
  } catch (e) {
    next(e);
  }
};

// controllers/user.controller.js
export const getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await userRepo.getAll({
      limit,
      offset,
      search: req.query.search,
      rol: req.query.rol,
    });

    // ✅ CORRECCIÓN: userRepo.getAll devuelve { rows, total }
    // La función paginated espera { data, total, page, limit }
    paginated(res, {
      data: result.rows, // ← Los usuarios están en 'rows', no en 'data'
      total: result.total,
      page: page,
      limit: limit,
    });
  } catch (e) {
    next(e);
  }
};
export const getOne = async (req, res, next) => {
  try {
    const u = await userRepo.findById(req.params.id);
    if (!u) return error(res, "Usuario no encontrado", 404);
    success(res, u);
  } catch (e) {
    next(e);
  }
};
export const changeStatus = async (req, res, next) => {
  try {
    await userRepo.update(req.params.id, { activo: req.body.activo ? 1 : 0 });
    success(res, null, "Estado actualizado");
  } catch (e) {
    next(e);
  }
};
export const changeRole = async (req, res, next) => {
  try {
    if (!["admin", "cliente", "vendedor"].includes(req.body.rol))
      return error(res, "Rol inválido", 400);
    await userRepo.update(req.params.id, { rol: req.body.rol });
    success(res, null, "Rol actualizado");
  } catch (e) {
    next(e);
  }
};
