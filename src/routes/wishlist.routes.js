import { Router } from "express";
import * as ctrl from "../controllers/wishlist.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", authJWT, ctrl.getWishlist);
router.post("/:productId", authJWT, ctrl.toggle);
router.delete("/", authJWT, ctrl.clearAll);
export default router;
