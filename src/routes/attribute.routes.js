import { Router } from "express";
import * as ctrl from "../controllers/attribute.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// ✅ Público: el frontend necesita saber qué atributos tiene una categoría
// para armar el sidebar de filtros y el detalle de producto.
router.get(
  "/categories/:categoryId/attributes",
  publicLimiter,
  ctrl.getByCategoryId,
);

// ✅ Admin: CRUD de definiciones de atributos
router.get("/", authJWT, isAdmin, ctrl.getAll);
router.post("/", authJWT, isAdmin, ctrl.create);
router.put("/:id", authJWT, isAdmin, ctrl.update);
router.delete("/:id", authJWT, isAdmin, ctrl.remove);

// ✅ Admin: asociar/desasociar atributos a una categoría
router.post(
  "/categories/:categoryId/attributes",
  authJWT,
  isAdmin,
  ctrl.assignToCategory,
);
router.delete(
  "/categories/:categoryId/attributes/:attributeId",
  authJWT,
  isAdmin,
  ctrl.removeFromCategory,
);

export default router;
