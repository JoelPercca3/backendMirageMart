// src/routes/notification.routes.js
import { Router } from "express";
import * as ctrl from "../controllers/notification.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authJWT, ctrl.getNotifications);
router.patch("/:id/read", authJWT, ctrl.markAsRead);
router.patch("/read-all", authJWT, ctrl.markAllAsRead);
router.delete("/:id", authJWT, ctrl.deleteNotification);

export default router;
