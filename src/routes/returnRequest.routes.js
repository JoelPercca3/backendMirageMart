import { Router } from "express";
import * as ctrl from "../controllers/returnRequest.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

router.post("/", authJWT, ctrl.create);

router.get("/", authJWT, isAdmin, ctrl.getAll);
router.patch("/:id/approve", authJWT, isAdmin, ctrl.approve);
router.patch("/:id/reject", authJWT, isAdmin, ctrl.reject);
router.patch("/:id/received", authJWT, isAdmin, ctrl.markReceived);
router.patch("/:id/confirm-refund", authJWT, isAdmin, ctrl.confirmAndRefund);

export default router;
