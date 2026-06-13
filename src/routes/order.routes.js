import { Router } from "express";
import {
  orderCreate,
  myOrders,
  orderGetOne,
  cancel,
  orderGetAll,
  orderUpdateStatus,
  orderUpdateTracking,
} from "../controllers/order.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

router.post("/", authJWT, orderCreate); // ← ESTE ES EL QUE NECESITAS
router.get("/my-orders", authJWT, myOrders);
router.get("/", authJWT, isAdmin, orderGetAll);
router.get("/:id", authJWT, orderGetOne);
router.put("/:id/cancel", authJWT, cancel);
router.put("/:id/status", authJWT, isAdmin, orderUpdateStatus);
router.put("/:id/tracking", authJWT, isAdmin, orderUpdateTracking);

export default router;
