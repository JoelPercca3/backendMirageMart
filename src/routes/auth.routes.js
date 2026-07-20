import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import {
  authLimiter,
  verifyCodeLimiter,
  resendCodeLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  completeProfileSchema,
  resendCodeSchema,
  verifyCodeSchema,
} from "../schemas/auth.schema.js";
import { CLIENT_URL } from "../config/env.js";

import passport from "../config/passport.js";
import { generateTokens } from "../services/auth.service.js";

const router = Router();

// Rutas existentes
router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
router.post("/refresh", ctrl.refreshToken);
router.post("/logout", authJWT, ctrl.logout);
router.get("/me", authJWT, ctrl.me);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotSchema),
  ctrl.forgotPassword,
);

// Verificación de email por código (6 dígitos)
router.post("/resend-code", authLimiter, ctrl.resendCode);
router.post("/verify-code", authLimiter, ctrl.verifyCode);
router.post(
  "/resend-code",
  authLimiter,
  validate(resendCodeSchema),
  ctrl.resendCode,
);
router.post(
  "/verify-code",
  authLimiter,
  validate(verifyCodeSchema),
  ctrl.verifyCode,
);
router.post(
  "/reset-password/:token",
  validate(resetSchema),
  ctrl.resetPassword,
);

router.patch(
  "/complete-profile",
  authJWT,
  validate(completeProfileSchema),
  ctrl.completeProfile,
);
router.post(
  "/resend-code",
  resendCodeLimiter,
  validate(resendCodeSchema),
  ctrl.resendCode,
);
router.post(
  "/verify-code",
  verifyCodeLimiter,
  validate(verifyCodeSchema),
  ctrl.verifyCode,
);
// ========== RUTAS DE GOOGLE ==========
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      console.log("Usuario de Google:", req.user);

      const payload = {
        id: req.user.id,
        email: req.user.email,
        rol: req.user.rol || "cliente",
      };
      const { accessToken, refreshToken } = generateTokens(payload);

      console.log("Tokens generados:", { accessToken, refreshToken });

      res.redirect(
        `${CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
      );
    } catch (error) {
      console.error("Error en callback:", error);
      res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
    }
  },
);
export default router;
