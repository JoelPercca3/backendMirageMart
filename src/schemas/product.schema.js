import { z } from "zod";

export const productSchema = z.object({
  nombre: z.string().min(3).max(300),

  descripcion: z.string().optional(),

  descripcion_corta: z.string().max(500).optional(),

  category_id: z.coerce.number().int().positive(),

  brand_id: z.coerce.number().int().positive().optional().nullable(),

  precio_base: z.coerce.number().positive("El precio base debe ser mayor a 0"),

  precio_oferta: z.coerce.number().positive().optional().nullable(),

  sku: z.string().min(1).max(100),

  stock_total: z.coerce.number().int().min(0).default(0),

  peso_kg: z.coerce.number().positive().optional().nullable(),

  estado: z
    .enum(["activo", "inactivo", "agotado", "borrador"])
    .default("activo"),

  es_destacado: z.coerce.boolean().default(false),

  es_nuevo: z.coerce.boolean().default(true),

  tags: z.array(z.string()).optional(),

  imagen_url: z.string().optional(),

  imagenes: z.array(z.string()).optional(),

  // ✅ ATRIBUTOS
  atributos: z
    .array(
      z.object({
        atributo: z.string().min(1),
        valor: z.string().min(1),
      }),
    )
    .optional(),

  // ✅ VARIANTES
  variantes: z
    .array(
      z.object({
        sku_variante: z.string().optional(),

        opciones: z.record(z.string()),

        precio_extra: z.coerce.number().default(0),

        stock: z.coerce.number().int().min(0).default(0),

        imagen_url: z.string().nullish(),

        activo: z.coerce.boolean().default(true),
      }),
    )
    .optional(),
});

export const productUpdateSchema = productSchema.partial();
