import { Router } from "express";
import * as ctrl from "../controllers/cart.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authJWT, ctrl.getCart);
router.post("/add", authJWT, ctrl.addItem);
router.post("/merge", authJWT, ctrl.mergeCart); // ← AGREGAR ESTA LÍNEA
router.put("/item/:id", authJWT, ctrl.updateQuantity);
router.delete("/item/:id", authJWT, ctrl.removeItem);
router.delete("/clear", authJWT, ctrl.clearCart);
router.post("/apply-coupon", authJWT, ctrl.applyCoupon);

export default router;
