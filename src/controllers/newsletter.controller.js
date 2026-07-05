import * as newsletterSvc from "../services/newsletter.service.js";
import { success } from "../utils/response.js";

export const subscribe = async (req, res, next) => {
  try {
    await newsletterSvc.subscribe(req.body.email);
    success(res, null, "¡Listo! Ya estás suscrito a nuestras novedades.");
  } catch (e) {
    next(e);
  }
};
