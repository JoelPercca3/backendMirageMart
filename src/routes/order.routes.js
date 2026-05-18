import { Router } from "express";
import * as ctrl from "../controllers/category.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.get("/:id/products", ctrl.getProducts);
router.post("/", authJWT, isAdmin, ctrl.create);
router.put("/:id", authJWT, isAdmin, ctrl.update);
router.delete("/:id", authJWT, isAdmin, ctrl.remove);
export default router;
