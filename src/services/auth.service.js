import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as userRepo from "../repositories/user.repository.js";
import * as emailVerRepo from "../repositories/emailVerification.repository.js";
import * as emailSvc from "./email.service.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { generateToken } from "../utils/generateCode.js";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} from "../config/env.js";
import { BCRYPT_ROUNDS, EMAIL_VERIFICATION } from "../config/constants.js";
import { pool } from "../config/database.js";

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateTokens = (payload) => ({
  accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
  refreshToken: jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  }),
});

// ─────────────────────────────────────────────
// REGISTRO
// ─────────────────────────────────────────────
export const register = async ({
  nombre,
  email,
  password,
  telefono,
  tipo_documento,
  numero_documento,
}) => {
  const existingEmail = await userRepo.findByEmail(email);
  if (existingEmail) throw new AppError("El email ya está registrado", 409);

  const existingDoc = await userRepo.findByDocumento(numero_documento);
  if (existingDoc)
    throw new AppError("El número de documento ya está registrado", 409);

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const connection = await pool.getConnection();
  let userId;
  let codigo;

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users
        (nombre, email, password_hash, telefono, tipo_documento, numero_documento, email_verificado, activo)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        nombre,
        email,
        password_hash,
        telefono || null,
        tipo_documento || null,
        numero_documento || null,
      ],
    );
    userId = result.insertId;

    codigo = generateVerificationCode();
    const now = new Date();
    const expira_en = new Date(
      now.getTime() + EMAIL_VERIFICATION.EXPIRATION_MINUTES * 60000,
    );

    await connection.query(
      `INSERT INTO email_verifications
        (user_id, codigo, intentos, expira_en, reenvios_count, primer_envio_en, ultimo_envio_en)
       VALUES (?, ?, 0, ?, 1, ?, ?)`,
      [userId, codigo, expira_en, now, now],
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw new AppError("Error al crear la cuenta. Intenta nuevamente.", 500);
  } finally {
    connection.release();
  }

  // Envío de email FUERA de la transacción (ya confirmada en BD)
  try {
    await emailSvc.sendVerificationCode(email, nombre, codigo);
  } catch (emailError) {
    console.error("Error al enviar email de verificación:", emailError);
    // Si el correo falla, deshacemos todo manualmente
    await emailVerRepo.deleteByUserId(userId);
    await pool.query(`DELETE FROM users WHERE id = ?`, [userId]);
    throw new AppError(
      "No se pudo enviar el correo de verificación. Intenta registrarte nuevamente.",
      502,
    );
  }

  return { id: userId, nombre, email, requireVerification: true };
};

// ─────────────────────────────────────────────
// REENVIAR CÓDIGO
// ─────────────────────────────────────────────
export const resendVerificationCode = async (email) => {
  const user = await userRepo.findByEmail(email);
  if (!user) throw new AppError("No existe una cuenta con este email", 404);
  if (user.email_verificado)
    throw new AppError("Este email ya está verificado", 400);

  const record = await emailVerRepo.findByUserId(user.id);
  const now = new Date();

  let reenvios_count = 1;
  let primer_envio_en = now;

  if (record) {
    // Cooldown entre reenvíos
    if (record.ultimo_envio_en) {
      const secondsSinceLast = (now - new Date(record.ultimo_envio_en)) / 1000;
      if (secondsSinceLast < EMAIL_VERIFICATION.RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(
          EMAIL_VERIFICATION.RESEND_COOLDOWN_SECONDS - secondsSinceLast,
        );
        throw new AppError(
          `Espera ${wait} segundos antes de solicitar otro código`,
          429,
        );
      }
    }

    // Ventana de 1 hora para el límite de reenvíos
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (new Date(record.primer_envio_en) > hourAgo) {
      if (record.reenvios_count >= EMAIL_VERIFICATION.MAX_RESENDS_PER_HOUR) {
        throw new AppError(
          "Has alcanzado el máximo de reenvíos. Intenta en una hora.",
          429,
        );
      }
      reenvios_count = record.reenvios_count + 1;
      primer_envio_en = record.primer_envio_en;
    }
    // si ya pasó la hora, se resetea la ventana (reenvios_count = 1, primer_envio_en = now)
  }

  const codigo = generateVerificationCode();
  const expira_en = new Date(
    now.getTime() + EMAIL_VERIFICATION.EXPIRATION_MINUTES * 60000,
  );

  if (record) {
    await emailVerRepo.updateForResend(user.id, {
      codigo,
      expira_en,
      reenvios_count,
      primer_envio_en,
      ultimo_envio_en: now,
    });
  } else {
    await emailVerRepo.create({
      user_id: user.id,
      codigo,
      expira_en,
      reenvios_count,
      primer_envio_en,
      ultimo_envio_en: now,
    });
  }

  await emailSvc.sendVerificationCode(user.email, user.nombre, codigo);

  return { sent: true };
};

// ─────────────────────────────────────────────
// VERIFICAR CÓDIGO
// ─────────────────────────────────────────────
export const verifyCode = async (email, codigo) => {
  if (!/^\d{6}$/.test(codigo || ""))
    throw new AppError("El código debe tener 6 dígitos", 400);

  const user = await userRepo.findByEmail(email);
  if (!user) throw new AppError("Usuario no encontrado", 404);
  if (user.email_verificado) return { alreadyVerified: true };

  const record = await emailVerRepo.findByUserId(user.id);
  if (!record)
    throw new AppError(
      "No se encontró un código de verificación. Solicita uno nuevo.",
      404,
    );

  const now = new Date();

  if (record.bloqueado_hasta && new Date(record.bloqueado_hasta) > now) {
    const minutesLeft = Math.ceil(
      (new Date(record.bloqueado_hasta) - now) / 60000,
    );
    throw new AppError(
      `Demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minutos.`,
      429,
    );
  }

  if (new Date(record.expira_en) < now) {
    throw new AppError("El código ha expirado. Solicita uno nuevo.", 400);
  }

  if (record.codigo !== codigo) {
    const intentos = record.intentos + 1;

    if (intentos >= EMAIL_VERIFICATION.MAX_VERIFY_ATTEMPTS) {
      const bloqueado_hasta = new Date(
        now.getTime() + EMAIL_VERIFICATION.LOCKOUT_MINUTES * 60000,
      );
      await emailVerRepo.setBloqueado(user.id, bloqueado_hasta);
      throw new AppError(
        `Código incorrecto. Cuenta bloqueada temporalmente por ${EMAIL_VERIFICATION.LOCKOUT_MINUTES} minutos.`,
        429,
      );
    }

    await emailVerRepo.incrementIntentos(user.id);
    throw new AppError(
      `Código incorrecto. Te quedan ${EMAIL_VERIFICATION.MAX_VERIFY_ATTEMPTS - intentos} intentos.`,
      400,
    );
  }

  await userRepo.update(user.id, { email_verificado: 1 });
  await emailVerRepo.deleteByUserId(user.id);

  return { verified: true };
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email);

  if (!user || !user.password_hash) {
    throw new AppError(
      "Correo electrónico o contraseña incorrecta. Por favor, vuelve a intentarlo nuevamente.",
      401,
    );
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    throw new AppError(
      "Correo electrónico o contraseña incorrecta. Por favor, vuelve a intentarlo nuevamente.",
      401,
    );
  }

  if (!user.activo) {
    throw new AppError(
      "Tu cuenta está desactivada. Contacta con soporte.",
      403,
    );
  }

  if (!user.email_verificado) {
    const err = new AppError(
      "Debes verificar tu email antes de iniciar sesión.",
      403,
    );
    err.requireVerification = true;
    err.email = user.email;
    throw err;
  }

  await userRepo.update(user.id, { ultimo_login: new Date() });

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    rol: user.rol,
  });

  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      avatar_url: user.avatar_url,
      telefono: user.telefono,
      tipo_documento: user.tipo_documento,
      numero_documento: user.numero_documento,
      email_verificado: user.email_verificado,
    },
    ...tokens,
  };
};

// ─────────────────────────────────────────────
// (resto de tus funciones sin cambios)
// ─────────────────────────────────────────────
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

export const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails[0].value;
  const nombre = profile.displayName;
  const googleId = profile.id;
  const avatar_url = profile.photos?.[0]?.value || null;

  let user = await userRepo.findByEmail(email);

  if (!user) {
    const id = await userRepo.create({
      nombre,
      email,
      google_id: googleId,
      avatar_url,
      email_verificado: 1,
      activo: 1,
    });
    user = {
      id,
      email,
      nombre,
      rol: "cliente",
      avatar_url,
      email_verificado: 1,
    };
  } else if (!user.google_id) {
    await userRepo.update(user.id, {
      google_id: googleId,
      avatar_url,
      email_verificado: 1,
    });
    user.avatar_url = avatar_url;
    user.google_id = googleId;
    user.email_verificado = 1;
  } else if (user.avatar_url !== avatar_url && avatar_url) {
    await userRepo.update(user.id, { avatar_url });
    user.avatar_url = avatar_url;
  }

  return user;
};

export const completeProfile = async (
  userId,
  { tipo_documento, numero_documento, telefono },
) => {
  const existingDoc = await userRepo.findByDocumento(numero_documento);
  if (existingDoc && existingDoc.id !== userId) {
    throw new AppError("El número de documento ya está registrado", 409);
  }

  await userRepo.update(userId, {
    tipo_documento,
    numero_documento,
    ...(telefono ? { telefono } : {}),
  });

  return userRepo.findById(userId);
};

export { generateTokens };
