import { Router } from "express";
import * as ctrl from "../controllers/review.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();
router.post("/", authJWT, ctrl.create);
router.put("/:id", authJWT, ctrl.update);
router.delete("/:id", authJWT, ctrl.remove);
router.post("/:id/helpful", authJWT, ctrl.markHelpful);
router.get("/", authJWT, isAdmin, ctrl.getAll);
router.patch("/:id/approve", authJWT, isAdmin, ctrl.approve);

// Ruta pública - NO requiere autenticación ni admin
router.get("/product/:productId", ctrl.getByProduct);

// Las rutas protegidas existentes...
router.post("/", authJWT, ctrl.create);
// ...
export default router;
