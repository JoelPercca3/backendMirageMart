import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
} from "../schemas/auth.schema.js";
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
router.post(
  "/reset-password/:token",
  validate(resetSchema),
  ctrl.resetPassword,
);
router.get("/verify-email/:token", ctrl.verifyEmail);

// ========== RUTAS DE GOOGLE ==========
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // ← Agrega esta línea
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
      console.log("Usuario de Google:", req.user); // Debug

      const payload = {
        id: req.user.id,
        email: req.user.email,
        rol: req.user.rol || "cliente",
      };
      const { accessToken, refreshToken } = generateTokens(payload);

      console.log("Tokens generados:", { accessToken, refreshToken }); // Debug

      res.redirect(
        `http://localhost:3000/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
      );
    } catch (error) {
      console.error("Error en callback:", error);
      res.redirect(`http://localhost:3000/login?error=google_auth_failed`);
    }
  },
);

export default router;
