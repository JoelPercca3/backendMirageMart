import { NODE_ENV } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);

  // Errores MySQL2 comunes
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ ok: false, message: "El recurso ya existe (duplicado)." });
  if (err.code === "ER_NO_REFERENCED_ROW_2")
    return res
      .status(400)
      .json({
        ok: false,
        message: "Referencia inválida — registro relacionado no encontrado.",
      });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Error interno del servidor";

  return res.status(statusCode).json({
    ok: false,
    message,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
