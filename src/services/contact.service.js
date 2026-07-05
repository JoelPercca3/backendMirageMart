import * as contactRepo from "../repositories/contact.repository.js";
import {
  sendContactAdminNotification,
  sendContactConfirmation,
} from "./email.service.js";

export const send = async ({ nombre, email, mensaje }) => {
  // ✅ Guardamos el mensaje en la BD primero — así queda registrado aunque
  // el envío de algún email falle (ej. si el proveedor SMTP está caído).
  await contactRepo.create({ nombre, email, mensaje });

  await Promise.all([
    sendContactAdminNotification(nombre, email, mensaje).catch((err) =>
      console.error("Error al notificar mensaje de contacto:", err),
    ),
    sendContactConfirmation(nombre, email).catch((err) =>
      console.error("Error al enviar confirmación de contacto:", err),
    ),
  ]);
};
