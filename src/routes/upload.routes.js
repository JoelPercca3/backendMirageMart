import { Router } from "express";
import * as ctrl from "../controllers/upload.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { uploadLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  uploadProduct,
  uploadBanner,
  uploadCategory,
  uploadReview,
  uploadAvatar,
  uploadReturnEvidence,
} from "../middlewares/upload.middleware.js";

const router = Router();

// ─── Rutas de ADMIN ───────────────────────────────────────────────────────────

/** Productos */
router.post(
  "/product",
  authJWT,
  isAdmin,
  uploadLimiter,
  uploadProduct.single("image"),
  ctrl.uploadProductImage,
);
router.post(
  "/products",
  authJWT,
  isAdmin,
  uploadLimiter,
  uploadProduct.array("images", 10),
  ctrl.uploadProductImages,
);

/** Banners */
router.post(
  "/banner",
  authJWT,
  isAdmin,
  uploadLimiter,
  uploadBanner.single("image"),
  ctrl.uploadBannerImage,
);

/** Categorías */
router.post(
  "/category",
  authJWT,
  isAdmin,
  uploadLimiter,
  uploadCategory.single("image"),
  ctrl.uploadCategoryImage,
);

router.delete("/file", authJWT, isAdmin, ctrl.deleteFile);

// ─── Rutas de USUARIO AUTENTICADO ────────────────────────────────────────────

/** Reseñas */
router.post(
  "/review",
  authJWT,
  uploadLimiter,
  uploadReview.single("image"),
  ctrl.uploadReviewImage,
);

/** Avatar */
router.post(
  "/avatar",
  authJWT,
  uploadLimiter,
  uploadAvatar.single("image"),
  ctrl.uploadAvatarImage,
);

/** Evidencia de devolución (hasta 5 fotos) */
router.post(
  "/return-evidence",
  authJWT,
  uploadLimiter,
  uploadReturnEvidence.array("images", 5),
  ctrl.uploadReturnEvidenceImages,
);
export default router;
