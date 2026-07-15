import * as authSvc from "../services/auth.service.js";
import * as userRepo from "../repositories/user.repository.js";
import { success, created, error } from "../utils/response.js";

export const register = async (req, res, next) => {
  try {
    created(
      res,
      await authSvc.register(req.body),
      "Registro exitoso. Revisa tu email para verificar tu cuenta.",
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    success(res, await authSvc.login(req.body), "Inicio de sesión exitoso");
  } catch (err) {
    // Si el error trae requireVerification, lo devolvemos en la respuesta
    // para que el frontend pueda redirigir a la pantalla de "verifica tu código"
    if (err.requireVerification) {
      return error(res, err.message, err.statusCode || 403, {
        requireVerification: true,
        email: err.email,
      });
    }
    next(err);
  }
};

export const resendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authSvc.resendVerificationCode(email);
    success(res, null, "Código reenviado. Revisa tu correo.");
  } catch (err) {
    next(err);
  }
};

export const verifyCode = async (req, res, next) => {
  try {
    const { email, codigo } = req.body;
    const result = await authSvc.verifyCode(email, codigo);
    success(res, result, "Email verificado exitosamente.");
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.headers["x-refresh-token"];
    success(res, await authSvc.refreshToken(token), "Token renovado");
  } catch (err) {
    next(err);
  }
};

export const logout = (_req, res) =>
  success(res, null, "Sesión cerrada exitosamente");

export const me = async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) return error(res, "Usuario no encontrado", 404);
    success(res, user);
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authSvc.forgotPassword(req.body.email);
    success(
      res,
      null,
      "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
    );
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await authSvc.resetPassword(req.params.token, req.body.password);
    success(res, null, "Contraseña restablecida. Ya puedes iniciar sesión.");
  } catch (err) {
    next(err);
  }
};

export const completeProfile = async (req, res, next) => {
  try {
    const user = await authSvc.completeProfile(req.user.id, req.body);
    success(res, user, "Perfil completado exitosamente");
  } catch (err) {
    next(err);
  }
};
