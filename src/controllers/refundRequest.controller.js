import * as refundRequestService from "../services/refundRequest.service.js";
import { success, created, paginated, error } from "../utils/response.js";

export const create = async (req, res, next) => {
  try {
    const { order_id, motivo, comentario } = req.body;
    const result = await refundRequestService.createRequest(req.user.id, {
      order_id,
      motivo,
      comentario,
    });
    created(
      res,
      result,
      "Solicitud de reembolso enviada. Te avisaremos cuando sea revisada.",
    );
  } catch (err) {
    next(err);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const result = await refundRequestService.getAll(req.query);
    paginated(res, result);
  } catch (err) {
    next(err);
  }
};

export const approve = async (req, res, next) => {
  try {
    const result = await refundRequestService.approveRequest(
      req.params.id,
      req.user.id,
    );
    success(
      res,
      result,
      "Solicitud aprobada y reembolso procesado exitosamente",
    );
  } catch (err) {
    if (err.response?.data) {
      console.error(
        "❌ Error Culqi (aprobar solicitud):",
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

export const reject = async (req, res, next) => {
  try {
    await refundRequestService.rejectRequest(
      req.params.id,
      req.user.id,
      req.body.respuesta_admin,
    );
    success(res, null, "Solicitud rechazada");
  } catch (err) {
    next(err);
  }
};
