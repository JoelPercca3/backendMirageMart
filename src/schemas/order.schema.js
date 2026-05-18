import { z } from "zod";

export const orderSchema = z.object({
  address_id: z
    .number()
    .int()
    .positive("Debes seleccionar una dirección de envío"),
  shipping_method_id: z
    .number()
    .int()
    .positive("Debes seleccionar un método de envío"),
  coupon_code: z.string().optional(),
  notas_cliente: z.string().max(500).optional(),
});
