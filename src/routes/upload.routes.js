import { Router } from "express";
import * as ctrl from "../controllers/upload.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import {
  uploadProduct,
  uploadBanner,
  uploadCategory,
  uploadReview,
  uploadAvatar,
} from "../middlewares/upload.middleware.js";

const router = Router();

// ─── Rutas de ADMIN ───────────────────────────────────────────────────────────

/** Productos */
router.post(
  "/product",
  authJWT,
  isAdmin,
  uploadProduct.single("image"),
  ctrl.uploadProductImage,
);
router.post(
  "/products",
  authJWT,
  isAdmin,
  uploadProduct.array("images", 10),
  ctrl.uploadProductImages,
);

/** Banners */
router.post(
  "/banner",
  authJWT,
  isAdmin,
  uploadBanner.single("image"),
  ctrl.uploadBannerImage,
);

/** Categorías */
router.post(
  "/category",
  authJWT,
  isAdmin,
  uploadCategory.single("image"),
  ctrl.uploadCategoryImage,
);

/** Eliminar (cualquier tipo) */
router.delete("/:filename", authJWT, isAdmin, ctrl.deleteFile);

// ─── Rutas de USUARIO AUTENTICADO ────────────────────────────────────────────

/** Reseñas */
router.post(
  "/review",
  authJWT,
  uploadReview.single("image"),
  ctrl.uploadReviewImage,
);

/** Avatar */
router.post(
  "/avatar",
  authJWT,
  uploadAvatar.single("image"),
  ctrl.uploadAvatarImage,
);

export default router;
