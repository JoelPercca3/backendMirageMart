import { Router } from "express";
import {
  orderCreate,
  myOrders,
  orderGetOne,
  orderComprobante,
  cancel,
  orderGetAll,
  orderUpdateStatus,
  orderUpdateTracking,
  confirmDelivery, // ✅ Agregar importación
} from "../controllers/order.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { requireDocumento } from "../middlewares/requireDocumento.middleware.js";
import { createOrderLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Rutas de cliente
router.post("/", authJWT, createOrderLimiter, requireDocumento, orderCreate);
router.get("/my-orders", authJWT, myOrders);
router.get("/:id", authJWT, orderGetOne);
router.get("/:id/comprobante", authJWT, orderComprobante);
router.patch("/:id/confirm-delivery", authJWT, confirmDelivery); // ✅ Usar confirmDelivery

// Rutas de admin
router.get("/", authJWT, isAdmin, orderGetAll);
router.put("/:id/cancel", authJWT, cancel);
router.put("/:id/status", authJWT, isAdmin, orderUpdateStatus);
router.put("/:id/tracking", authJWT, isAdmin, orderUpdateTracking);

export default router;
