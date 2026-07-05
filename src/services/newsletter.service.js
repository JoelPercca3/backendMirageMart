import * as newsletterRepo from "../repositories/newsletter.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const subscribe = async (email) => {
  const existing = await newsletterRepo.findByEmail(email);

  if (existing) {
    if (existing.activo) {
      throw new AppError("Este correo ya está suscrito", 409);
    }
    // Estaba desuscrito antes — lo reactivamos en vez de duplicar
    await newsletterRepo.reactivate(existing.id);
    return { reactivated: true };
  }

  await newsletterRepo.create(email);
  return { reactivated: false };
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const offset = (page - 1) * limit;

  const { rows, total } = await newsletterRepo.getAll({
    limit,
    offset,
    search: query.search,
    activo: query.activo,
  });

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const setActivo = async (id, activo) => {
  await newsletterRepo.setActivo(id, activo);
};
