import * as orderSvc from "../services/order.service.js";
import { success, created, paginated } from "../utils/response.js";

export const orderCreate = async (req, res, next) => {
  try {
    created(
      res,
      await orderSvc.create(req.user.id, req.body, req.ip),
      "Pedido creado exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

export const myOrders = async (req, res, next) => {
  try {
    paginated(res, await orderSvc.myOrders(req.user.id, req.query));
  } catch (e) {
    next(e);
  }
};

export const orderGetOne = async (req, res, next) => {
  try {
    success(
      res,
      await orderSvc.getOne(Number(req.params.id), req.user.id, req.user.rol),
    );
  } catch (e) {
    next(e);
  }
};

export const cancel = async (req, res, next) => {
  try {
    await orderSvc.cancel(Number(req.params.id), req.user.id);
    success(res, null, "Pedido cancelado");
  } catch (e) {
    next(e);
  }
};

export const orderGetAll = async (req, res, next) => {
  try {
    const result = await orderSvc.getAll(req.query);
    res.json({
      ok: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const orderUpdateStatus = async (req, res, next) => {
  try {
    await orderSvc.updateStatus(
      Number(req.params.id),
      req.body.estado,
      req.body.comentario,
      req.user.id,
    );
    success(res, null, "Estado actualizado");
  } catch (e) {
    next(e);
  }
};

export const orderUpdateTracking = async (req, res, next) => {
  try {
    await orderSvc.updateTracking(
      Number(req.params.id),
      req.body.tracking_number,
    );
    success(res, null, "Tracking actualizado");
  } catch (e) {
    next(e);
  }
};
