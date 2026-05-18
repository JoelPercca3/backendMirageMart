import nodemailer from "nodemailer";
import {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
  CLIENT_URL,
} from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure: Number(MAIL_PORT) === 465,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
});

const send = async ({ to, subject, html }) => {
  if (!MAIL_USER || !MAIL_PASS) {
    console.warn("[Email] Sin configurar — saltando:", subject);
    return;
  }
  await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
};

export const sendVerification = (email, nombre, token) =>
  send({
    to: email,
    subject: "✅ Verifica tu cuenta — MiShop",
    html: `
    <h2>Hola ${nombre} 👋</h2>
    <p>Gracias por registrarte. Haz clic para verificar tu correo:</p>
    <a href="${CLIENT_URL}/verify-email/${token}"
       style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Verificar mi cuenta
    </a>
    <p style="color:#888;font-size:12px;margin-top:24px;">El enlace expira en 24 horas.</p>
  `,
  });

export const sendPasswordReset = (email, nombre, token) =>
  send({
    to: email,
    subject: "🔐 Restablecer contraseña — MiShop",
    html: `
    <h2>Hola ${nombre}</h2>
    <p>Recibimos una solicitud para restablecer tu contraseña:</p>
    <a href="${CLIENT_URL}/reset-password/${token}"
       style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Restablecer contraseña
    </a>
    <p style="color:#888;font-size:12px;margin-top:24px;">El enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
  `,
  });

export const sendOrderConfirmation = (email, nombre, order) =>
  send({
    to: email,
    subject: `📦 Pedido confirmado #${order.codigo_orden} — MiShop`,
    html: `
    <h2>¡Tu pedido fue recibido, ${nombre}!</h2>
    <p><strong>Código:</strong> ${order.codigo_orden}</p>
    <p><strong>Total:</strong> S/ ${order.total}</p>
    <p>Te notificaremos cuando sea enviado.</p>
    <a href="${CLIENT_URL}/orders/${order.id}"
       style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Ver mi pedido
    </a>
  `,
  });
