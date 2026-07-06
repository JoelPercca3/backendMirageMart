import { Router } from "express";
import * as ctrl from "../controllers/admin.controller.js";
import * as orderCtrl from "../controllers/order.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

router.use(authJWT, isAdmin);

// Dashboard
router.get("/dashboard", ctrl.dashboard);
router.get("/stats/sales", ctrl.salesStats);
router.get("/stats/products", ctrl.productStats);
router.get("/stats/users", ctrl.userStats);
router.get("/stats/revenue", ctrl.revenueStats);

// Usuarios
router.get("/users", ctrl.getUsers);
router.get("/users/:id", ctrl.getUser);
router.patch("/users/:id/status", ctrl.changeUserStatus);

// Órdenes
router.get("/orders", orderCtrl.orderGetAll);
router.get("/orders/:id", orderCtrl.orderGetOne);
router.patch("/orders/:id/status", orderCtrl.orderUpdateStatus);
router.patch("/orders/:id/tracking", orderCtrl.orderUpdateTracking);

// Categorías
router.get("/categories", ctrl.getCategories);
router.post("/categories", ctrl.createCategory);
router.put("/categories/:id", ctrl.updateCategory);
router.delete("/categories/:id", ctrl.deleteCategory);

// Reseñas
router.get("/reviews", ctrl.getReviews);
router.patch("/reviews/:id/approve", ctrl.approveReview);

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

// Settings
router.get("/settings", ctrl.getSettings);
router.put("/settings", ctrl.updateSettings);

// Shipping
router.get("/shipping", ctrl.getShippingMethods);
router.post("/shipping", ctrl.createShippingMethod);
router.put("/shipping/:id", ctrl.updateShippingMethod);

router.post("/promos/send", ctrl.sendPromo);

// Mensajes de contacto
router.get("/contact-messages", ctrl.getContactMessages);
router.patch("/contact-messages/:id/read", ctrl.markContactMessageRead);

// Libro de reclamaciones
router.get("/libro-reclamaciones", ctrl.getLibroReclamaciones);
router.get("/libro-reclamaciones/:id", ctrl.getLibroReclamacionItem);
router.patch(
  "/libro-reclamaciones/:id/responder",
  ctrl.responderLibroReclamacion,
);

// Newsletter
router.get("/newsletter-subscribers", ctrl.getNewsletterSubscribers);
router.patch(
  "/newsletter-subscribers/:id/status",
  ctrl.setNewsletterSubscriberStatus,
);

// Marcas
router.get("/brands", ctrl.getBrands);
router.post("/brands", ctrl.createBrand);

export default router;
