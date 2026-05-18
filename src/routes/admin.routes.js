import { Router } from "express";
import * as ctrl from "../controllers/admin.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

// Todos los endpoints de admin requieren JWT + rol admin
router.use(authJWT, isAdmin);

// Dashboard y estadísticas
router.get("/dashboard", ctrl.dashboard);
router.get("/stats/sales", ctrl.salesStats);
router.get("/stats/products", ctrl.productStats);
router.get("/stats/users", ctrl.userStats);
router.get("/stats/revenue", ctrl.revenueStats);

// Cupones
router.get("/coupons", ctrl.getCoupons);
router.post("/coupons", ctrl.createCoupon);
router.put("/coupons/:id", ctrl.updateCoupon);
router.delete("/coupons/:id", ctrl.deleteCoupon);

// Banners
router.get("/banners", ctrl.getBanners);
router.post("/banners", ctrl.createBanner);
router.put("/banners/:id", ctrl.updateBanner);
router.delete("/banners/:id", ctrl.deleteBanner);

// Configuración del sistema
router.get("/settings", ctrl.getSettings);
router.put("/settings", ctrl.updateSettings);

// Métodos de envío
router.get("/shipping", ctrl.getShippingMethods);
router.post("/shipping", ctrl.createShippingMethod);
router.put("/shipping/:id", ctrl.updateShippingMethod);

export default router;
