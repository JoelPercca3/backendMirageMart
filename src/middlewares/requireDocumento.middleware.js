import * as userRepo from "../repositories/user.repository.js";
import { AppError } from "./errorHandler.middleware.js";

export const requireDocumento = async (req, _res, next) => {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user?.numero_documento || !user?.tipo_documento) {
      throw new AppError(
        "Debes completar tu documento de identidad antes de continuar con la compra",
        400,
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};
