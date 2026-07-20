import * as bannerSvc from "../services/banner.service.js";
import { success, created } from "../utils/response.js";

// ─── Público ───────────────────────────────────────────────────────────────
export const getActive = async (req, res, next) => {
  try {
    success(res, await bannerSvc.getActive(req.query.tipo));
  } catch (e) {
    next(e);
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────
export const getAll = async (req, res, next) => {
  try {
    success(res, await bannerSvc.getAll());
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    created(res, await bannerSvc.create(req.body), "Banner creado");
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    success(
      res,
      await bannerSvc.update(Number(req.params.id), req.body),
      "Banner actualizado",
    );
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    await bannerSvc.remove(Number(req.params.id));
    success(res, null, "Banner eliminado");
  } catch (e) {
    next(e);
  }
};
