import { Router } from "express";
import { z } from "zod";
import { contactSend } from "../controllers/contact.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Schema del formulario de contacto — se queda aquí mismo porque solo lo
// usa esta ruta; si luego prefieres centralizar schemas, se puede mover.
export const contactSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().email("Email inválido").max(150),
  mensaje: z
    .string()
    .trim()
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(2000, "El mensaje es demasiado largo"),
});

// Público — sin authJWT, pero con rate limit más estricto que el general
// (300 req / 15 min) porque no requiere sesión y podría usarse para spam.
router.post("/", publicLimiter, validate(contactSchema), contactSend);

export default router;
