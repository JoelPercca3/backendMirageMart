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
import { webhookLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.post("/charge", authJWT, createCharge);
router.post("/create-intent", authJWT, createIntent);
router.post("/confirm/:orderId", authJWT, confirm);
router.post("/webhook", webhookLimiter, webhook);
router.get("/order/:orderId", authJWT, getByOrder);
router.post("/refund", authJWT, isAdmin, refund);
router.get("/", authJWT, isAdmin, paymentGetAll);

export default router;
