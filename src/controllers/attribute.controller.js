import * as attributeSvc from "../services/attribute.service.js";
import { success, created } from "../utils/response.js";

export const getAll = async (req, res, next) => {
  try {
    success(res, await attributeSvc.getAll());
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    created(res, await attributeSvc.create(req.body), "Atributo creado");
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    success(
      res,
      await attributeSvc.update(Number(req.params.id), req.body),
      "Atributo actualizado",
    );
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    await attributeSvc.remove(Number(req.params.id));
    success(res, null, "Atributo eliminado");
  } catch (e) {
    next(e);
  }
};

// ─── Por categoría ──────────────────────────────────────────────────────────
export const getByCategoryId = async (req, res, next) => {
  try {
    success(
      res,
      await attributeSvc.getByCategoryId(Number(req.params.categoryId)),
    );
  } catch (e) {
    next(e);
  }
};

export const assignToCategory = async (req, res, next) => {
  try {
    const result = await attributeSvc.assignToCategory(
      Number(req.params.categoryId),
      req.body,
    );
    success(res, result, "Atributo asignado a la categoría");
  } catch (e) {
    next(e);
  }
};

export const removeFromCategory = async (req, res, next) => {
  try {
    await attributeSvc.removeFromCategory(
      Number(req.params.categoryId),
      Number(req.params.attributeId),
    );
    success(res, null, "Atributo desasociado");
  } catch (e) {
    next(e);
  }
};
