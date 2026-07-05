import { Router } from "express";
import { z } from "zod";
import { subscribe } from "../controllers/newsletter.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

const newsletterSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido").max(150),
});

router.post("/", publicLimiter, validate(newsletterSchema), subscribe);

export default router;
