import * as contactSvc from "../services/contact.service.js";
import { success } from "../utils/response.js";

export const contactSend = async (req, res, next) => {
  try {
    await contactSvc.send(req.body);
    success(res, null, "Mensaje enviado. Te responderemos pronto.");
  } catch (e) {
    next(e);
  }
};
