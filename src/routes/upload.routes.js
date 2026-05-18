import { Router } from "express";
import * as ctrl from "../controllers/upload.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();
router.post(
  "/image",
  authJWT,
  isAdmin,
  upload.single("image"),
  ctrl.uploadImage,
);
router.post(
  "/images",
  authJWT,
  isAdmin,
  upload.array("images", 10),
  ctrl.uploadImages,
);
router.delete("/:filename", authJWT, isAdmin, ctrl.deleteFile);
export default router;
