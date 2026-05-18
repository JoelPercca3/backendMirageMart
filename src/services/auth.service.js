import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as userRepo from "../repositories/user.repository.js";
import * as emailSvc from "./email.service.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { generateToken } from "../utils/generateCode.js";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} from "../config/env.js";
import { BCRYPT_ROUNDS } from "../config/constants.js";
import { pool } from "../config/database.js";

const generateTokens = (payload) => ({
  accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
  refreshToken: jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  }),
});

export const register = async ({ nombre, email, password, telefono }) => {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw new AppError("El email ya está registrado", 409);

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const token_verificacion = generateToken();
  const id = await userRepo.create({
    nombre,
    email,
    password_hash,
    telefono,
    token_verificacion,
  });

  emailSvc
    .sendVerification(email, nombre, token_verificacion)
    .catch(console.error);
  return { id, nombre, email };
};

export const login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email);
  if (!user) throw new AppError("Credenciales incorrectas", 401);
  if (!user.activo)
    throw new AppError("Cuenta desactivada. Contacta al soporte.", 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError("Credenciales incorrectas", 401);

  userRepo.update(user.id, { ultimo_login: new Date() }).catch(console.error);

  const payload = { id: user.id, email: user.email, rol: user.rol };
  const tokens = generateTokens(payload);
  return {
    tokens,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      avatar_url: user.avatar_url,
      email_verificado: !!user.email_verificado,
    },
  };
};

export const refreshToken = async (token) => {
  if (!token) throw new AppError("Refresh token requerido", 401);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Refresh token inválido o expirado", 401);
  }

  const user = await userRepo.findById(decoded.id);
  if (!user || !user.activo)
    throw new AppError("Usuario no encontrado o inactivo", 401);

  return generateTokens({ id: user.id, email: user.email, rol: user.rol });
};

export const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email);
  if (!user) return;

  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await userRepo.update(user.id, {
    token_reset_password: token,
    token_reset_expires: expires,
  });
  emailSvc.sendPasswordReset(email, user.nombre, token).catch(console.error);
};

export const resetPassword = async (token, newPassword) => {
  const user = await userRepo.findByResetToken(token);
  if (!user) throw new AppError("Token inválido o expirado", 400);
  const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepo.update(user.id, {
    password_hash,
    token_reset_password: null,
    token_reset_expires: null,
  });
};

export const verifyEmail = async (token) => {
  const user = await userRepo.findByVerifyToken(token);
  if (!user) throw new AppError("Token de verificación inválido", 400);
  if (user.email_verificado) return;
  await userRepo.update(user.id, {
    email_verificado: 1,
    token_verificacion: null,
  });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const [rows] = await pool.query(
    "SELECT password_hash FROM users WHERE id = ?",
    [userId],
  );
  if (!rows[0]) throw new AppError("Usuario no encontrado", 404);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw new AppError("La contraseña actual es incorrecta", 400);
  const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepo.update(userId, { password_hash });
};
