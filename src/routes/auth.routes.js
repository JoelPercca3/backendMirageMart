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

const router = Router();

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

export default router;
