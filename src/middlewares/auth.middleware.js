import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { error } from "../utils/response.js";

export const authJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer "))
    return error(res, "Token de acceso requerido", 401);

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return error(
        res,
        "Token expirado. Por favor inicia sesión nuevamente.",
        401,
      );
    return error(res, "Token inválido.", 401);
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    } catch (_) {
      /* se ignora silenciosamente */
    }
  }
  next();
};
