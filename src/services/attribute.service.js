import * as attributeRepo from "../repositories/attribute.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

export const getAll = () => attributeRepo.getAll();

export const create = async (data) => {
  if (!data.nombre?.trim()) throw new AppError("El nombre es requerido", 400);
  const id = await attributeRepo.create(data);
  return attributeRepo.findById(id);
};

export const update = async (id, data) => {
  const existing = await attributeRepo.findById(id);
  if (!existing) throw new AppError("Atributo no encontrado", 404);
  await attributeRepo.update(id, data);
  return attributeRepo.findById(id);
};

export const remove = async (id) => {
  const ok = await attributeRepo.remove(id);
  if (!ok) throw new AppError("Atributo no encontrado", 404);
};

export const getByCategoryId = (categoryId) =>
  attributeRepo.getByCategoryId(categoryId);

export const assignToCategory = async (categoryId, data) => {
  if (!data.attribute_id) throw new AppError("Falta attribute_id", 400);
  await attributeRepo.assignToCategory(categoryId, data);
  return attributeRepo.getByCategoryId(categoryId);
};

export const removeFromCategory = async (categoryId, attributeId) => {
  const ok = await attributeRepo.removeFromCategory(categoryId, attributeId);
  if (!ok) throw new AppError("Asociación no encontrada", 404);
};
