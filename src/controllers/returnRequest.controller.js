import * as returnRequestService from "../services/returnRequest.service.js";
import { success, created, paginated, error } from "../utils/response.js";

export const create = async (req, res, next) => {
  try {
    const { order_id, order_item_id, motivo, comentario, cantidad, fotos } =
      req.body;
    const result = await returnRequestService.createRequest(req.user.id, {
      order_id,
      order_item_id,
      motivo,
      comentario,
      cantidad,
      fotos,
    });
    created(
      res,
      result,
      "Solicitud de devolución enviada. Te avisaremos cuando sea revisada.",
    );
  } catch (err) {
    next(err);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const result = await returnRequestService.getAll(req.query);
    paginated(res, result);
  } catch (err) {
    next(err);
  }
};

export const approve = async (req, res, next) => {
  try {
    await returnRequestService.approveRequest(
      req.params.id,
      req.user.id,
      req.body.instrucciones_admin,
    );
    success(res, null, "Solicitud aprobada");
  } catch (err) {
    next(err);
  }
};

export const reject = async (req, res, next) => {
  try {
    await returnRequestService.rejectRequest(
      req.params.id,
      req.user.id,
      req.body.respuesta_admin,
    );
    success(res, null, "Solicitud rechazada");
  } catch (err) {
    next(err);
  }
};

export const markReceived = async (req, res, next) => {
  try {
    await returnRequestService.markReceived(req.params.id, req.user.id);
    success(res, null, "Producto marcado como recibido");
  } catch (err) {
    next(err);
  }
};

export const confirmAndRefund = async (req, res, next) => {
  try {
    const result = await returnRequestService.confirmAndRefund(
      req.params.id,
      req.user.id,
    );
    success(
      res,
      result,
      "Devolución confirmada y reembolso procesado exitosamente",
    );
  } catch (err) {
    if (err.response?.data) {
      console.error(
        "❌ Error Culqi (devolución):",
        JSON.stringify(err.response.data, null, 2),
      );
      return error(
        res,
        err.response.data.user_message ||
          err.response.data.merchant_message ||
          "No se pudo procesar el reembolso",
        400,
      );
    }
    next(err);
  }
};
