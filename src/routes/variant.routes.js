import { Router } from "express";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { uploadProduct } from "../middlewares/upload.middleware.js"; // ← actualizado
import * as variantCtrl from "../controllers/variant.controller.js";

const router = Router();

// GET /api/admin/variants/:variantId/images
router.get(
  "/:variantId/images",
  authJWT,
  isAdmin,
  variantCtrl.getVariantImages,
);

// POST /api/admin/variants/:variantId/images
router.post(
  "/:variantId/images",
  authJWT,
  isAdmin,
  uploadProduct.single("image"), // ← actualizado
  variantCtrl.addImageToVariant,
);

// DELETE /api/admin/variants/images/:imageId
router.delete(
  "/images/:imageId",
  authJWT,
  isAdmin,
  variantCtrl.removeImageFromVariant,
);

// PUT /api/admin/variants/images/:imageId/primary
router.put(
  "/images/:imageId/primary",
  authJWT,
  isAdmin,
  variantCtrl.setImageAsPrimary,
);

export default router;
