// payment.routes.js
import { Router } from "express";
import {
  createIntent,
  confirm,
  webhook,
  getByOrder,
  refund,
  paymentGetAll,
} from "../controllers/payment.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
const paymentRouter = Router();
paymentRouter.post("/create-intent", authJWT, createIntent);
paymentRouter.post("/confirm/:orderId", authJWT, confirm);
paymentRouter.post("/webhook", webhook);
paymentRouter.get("/order/:orderId", authJWT, getByOrder);
paymentRouter.post("/refund/:paymentId", authJWT, isAdmin, refund);
paymentRouter.get("/", authJWT, isAdmin, paymentGetAll);
export default paymentRouter;
