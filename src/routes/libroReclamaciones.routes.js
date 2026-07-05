import { Router } from "express";
import { z } from "zod";
import {
  libroCreate,
  libroDescargarConstancia,
} from "../controllers/libroReclamaciones.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { publicLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Solo los campos que exige el Anexo I — nada extra que pueda leerse como
// una barrera indebida al derecho de reclamar (ver caso Wong/Indecopi).
export const libroSchema = z
  .object({
    tipo: z.enum(["reclamo", "queja"], {
      required_error: "Selecciona un tipo",
    }),
    nombre_completo: z
      .string()
      .trim()
      .min(2, "El nombre es muy corto")
      .max(150),
    tipo_documento: z.string().trim().max(10).optional().nullable(),
    numero_documento: z.string().trim().max(20).optional().nullable(),
    email: z.string().trim().email("Email inválido").max(150),
    telefono: z.string().trim().max(20).optional().nullable(),
    domicilio: z.string().trim().max(255).optional().nullable(),
    numero_pedido: z.string().trim().max(50).optional().nullable(),
    bien_contratado: z.string().trim().max(255).optional().nullable(),
    monto_reclamado: z.coerce.number().nonnegative().optional().nullable(),
    detalle: z
      .string()
      .trim()
      .min(10, "Cuéntanos con más detalle qué ocurrió")
      .max(3000),
    pedido_consumidor: z
      .string()
      .trim()
      .min(3, "Indica qué solución esperas")
      .max(1000),
    es_menor_edad: z.boolean().optional().default(false),
    nombre_apoderado: z.string().trim().max(150).optional().nullable(),
  })
  .refine(
    (data) =>
      !data.es_menor_edad ||
      (data.nombre_apoderado && data.nombre_apoderado.trim().length >= 2),
    {
      message: "Indica el nombre del padre, madre o apoderado",
      path: ["nombre_apoderado"],
    },
  );

router.post("/", publicLimiter, validate(libroSchema), libroCreate);
router.get("/constancia", publicLimiter, libroDescargarConstancia);

export default router;
