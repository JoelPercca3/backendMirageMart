import { z } from "zod";

const documentoRefine = (ctx, tipo_documento, numero_documento) => {
  if (tipo_documento === "DNI" && !/^\d{8}$/.test(numero_documento)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numero_documento"],
      message: "El DNI debe tener 8 dígitos numéricos",
    });
  }
  if (
    tipo_documento === "CE" &&
    !/^[A-Za-z0-9]{9,12}$/.test(numero_documento)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numero_documento"],
      message: "Carné de Extranjería inválido (9 a 12 caracteres)",
    });
  }
  if (
    tipo_documento === "PASAPORTE" &&
    !/^[A-Za-z0-9]{6,12}$/.test(numero_documento)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numero_documento"],
      message: "Pasaporte inválido (6 a 12 caracteres)",
    });
  }
};

export const registerSchema = z
  .object({
    nombre: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100),
    email: z.string().email("Email inválido").toLowerCase(),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    telefono: z.string().max(20).optional(),
    tipo_documento: z.enum(["DNI", "CE", "Pasaporte"], {
      errorMap: () => ({ message: "Selecciona un tipo de documento válido" }),
    }),
    numero_documento: z.string().min(1, "El número de documento es requerido"),
  })
  .superRefine(({ tipo_documento, numero_documento }, ctx) =>
    documentoRefine(ctx, tipo_documento, numero_documento),
  );

export const completeProfileSchema = z
  .object({
    tipo_documento: z.enum(["DNI", "CE", "Pasaporte"], {
      errorMap: () => ({ message: "Selecciona un tipo de documento válido" }),
    }),
    numero_documento: z.string().min(1, "El número de documento es requerido"),
    telefono: z.string().max(20).optional(),
  })
  .superRefine(({ tipo_documento, numero_documento }, ctx) =>
    documentoRefine(ctx, tipo_documento, numero_documento),
  );

export const loginSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const forgotSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
});

export const resetSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
});

export const resendCodeSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  codigo: z
    .string()
    .length(6, "El código debe tener exactamente 6 dígitos")
    .regex(/^\d{6}$/, "El código solo debe contener números"),
});
