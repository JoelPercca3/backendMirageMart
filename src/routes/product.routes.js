// product.routes.js
import { Router } from "express";
import * as ctrl from "../controllers/product.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  productSchema,
  productUpdateSchema,
} from "../schemas/product.schema.js";

const router = Router();
router.get("/", publicLimiter, ctrl.getAll);
router.get("/featured", publicLimiter, ctrl.getFeatured);
router.get("/search", publicLimiter, ctrl.search);
// ⚠️ IMPORTANTE: debe ir antes de "/:id", si no Express interpreta
// "filter-options" como si fuera un :id
router.get("/filter-options", publicLimiter, ctrl.getFilterOptions);
router.get("/:id", publicLimiter, ctrl.getOne);
router.get("/:id/related", publicLimiter, ctrl.getRelated);
router.get("/:id/reviews", publicLimiter, ctrl.getReviews);
router.post("/", authJWT, isAdmin, validate(productSchema), ctrl.create);
router.put(
  "/:id",
  authJWT,
  isAdmin,
  validate(productUpdateSchema),
  ctrl.update,
);
router.delete("/:id", authJWT, isAdmin, ctrl.remove);
router.patch("/:id/status", authJWT, isAdmin, ctrl.changeStatus);
router.patch("/:id/stock", authJWT, isAdmin, ctrl.updateStock);
export default router;
