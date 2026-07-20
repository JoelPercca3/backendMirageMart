import * as bannerRepo from "../repositories/banner.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const getActive = async (tipo) => {
  const tipoFilter = tipo === "promo" ? "promo" : "hero";
  return bannerRepo.getActive(tipoFilter);
};

export const getAll = () => bannerRepo.getAll();

export const create = async (data) => {
  if (!data.titulo?.trim()) throw new AppError("El título es requerido", 400);
  if (!data.imagen_url?.trim())
    throw new AppError("La imagen es requerida", 400);
  const id = await bannerRepo.create(data);
  return bannerRepo.findById(id);
};

export const update = async (id, data) => {
  const existing = await bannerRepo.findById(id);
  if (!existing) throw new AppError("Banner no encontrado", 404);
  await bannerRepo.update(id, data);
  return bannerRepo.findById(id);
};

export const remove = async (id) => {
  const ok = await bannerRepo.remove(id);
  if (!ok) throw new AppError("Banner no encontrado", 404);
};
