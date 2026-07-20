import { Router } from "express";
import * as ctrl from "../controllers/banner.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// ✅ Público: banners activos y vigentes
router.get("/", publicLimiter, ctrl.getActive);

// ✅ Admin: CRUD completo
router.get("/admin/all", authJWT, isAdmin, ctrl.getAll);
router.post("/admin", authJWT, isAdmin, ctrl.create);
router.put("/admin/:id", authJWT, isAdmin, ctrl.update);
router.delete("/admin/:id", authJWT, isAdmin, ctrl.remove);

export default router;
