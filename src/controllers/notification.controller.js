// src/controllers/notification.controller.js
import { pool } from "../config/database.js";
import { success } from "../utils/response.js";

// ─── Obtener notificaciones del usuario ───────────────────────────────────────
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const [rows] = await pool.query(
      `SELECT id, titulo, mensaje, tipo, url_accion, leido, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit],
    );

    const [[{ unread }]] = await pool.query(
      "SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND leido = 0",
      [userId],
    );

    success(res, { notifications: rows, unread });
  } catch (e) {
    next(e);
  }
};

// ─── Marcar una como leída ────────────────────────────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notifications SET leido = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );
    success(res, null, "Notificación marcada como leída");
  } catch (e) {
    next(e);
  }
};

// ─── Marcar todas como leídas ─────────────────────────────────────────────────
export const markAllAsRead = async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET leido = 1 WHERE user_id = ?", [
      req.user.id,
    ]);
    success(res, null, "Todas marcadas como leídas");
  } catch (e) {
    next(e);
  }
};

// ─── Eliminar una notificación ────────────────────────────────────────────────
export const deleteNotification = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    success(res, null, "Notificación eliminada");
  } catch (e) {
    next(e);
  }
};
