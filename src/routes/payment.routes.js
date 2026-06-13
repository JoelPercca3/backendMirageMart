import { Router } from "express";
import {
  createCharge,
  createIntent,
  confirm,
  webhook,
  getByOrder,
  refund,
  paymentGetAll,
} from "../controllers/payment.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

router.post("/charge", authJWT, createCharge);
router.post("/create-intent", authJWT, createIntent);
router.post("/confirm/:orderId", authJWT, confirm);
router.post("/webhook", webhook);
router.get("/order/:orderId", authJWT, getByOrder);
router.post("/refund/:paymentId", authJWT, isAdmin, refund);
router.get("/", authJWT, isAdmin, paymentGetAll);

export default router;
