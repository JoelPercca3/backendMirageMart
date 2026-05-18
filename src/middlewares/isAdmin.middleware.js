import { ROLES } from "../config/constants.js";
import { error } from "../utils/response.js";

export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== ROLES.ADMIN)
    return error(
      res,
      "Acceso denegado. Se requieren permisos de administrador.",
      403,
    );
  next();
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol))
      return error(
        res,
        "Acceso denegado. No tienes permiso para esta acción.",
        403,
      );
    next();
  };
