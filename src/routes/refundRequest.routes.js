import { Router } from "express";
import * as ctrl from "../controllers/refundRequest.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

// Cliente: crear solicitud
router.post("/", authJWT, ctrl.create);

// Admin: listar y resolver solicitudes
router.get("/", authJWT, isAdmin, ctrl.getAll);
router.patch("/:id/approve", authJWT, isAdmin, ctrl.approve);
router.patch("/:id/reject", authJWT, isAdmin, ctrl.reject);

export default router;
