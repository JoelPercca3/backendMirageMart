import nodemailer from "nodemailer";
import {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
  CLIENT_URL,
} from "../config/env.js";
import { escapeHTML } from "../utils/sanitize.js";

// ─── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure: Number(MAIL_PORT) === 465,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
  pool: true, // ← agrega esto
  maxConnections: 5, // ← opcional, limita conexiones simultáneas
});

// ─── Función base de envío ────────────────────────────────────────────────────
const send = async ({ to, subject, html, attachments }) => {
  const isProd = process.env.NODE_ENV === "production";

  if (!MAIL_USER || !MAIL_PASS) {
    const msg = `[Email] Credenciales no configuradas — no se pudo enviar: ${subject}`;
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(msg);
    return;
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });
    console.log(`✅ Email enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Error al enviar email a ${to}:`, err.message);
    throw err;
  }
};

// ─── Estilos base ─────────────────────────────────────────────────────────────
const baseCSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f3f4f6; }
  .wrap { max-width:600px; margin:32px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.10); }
  .header { background:linear-gradient(135deg,#ef4444,#dc2626); padding:36px 40px; text-align:center; }
  .header-logo { font-size:32px; font-weight:900; color:#fff; letter-spacing:-1px; }
  .header-sub { font-size:13px; color:rgba(255,255,255,0.80); margin-top:4px; }
  .body { padding:36px 40px; }
  .greeting { font-size:20px; font-weight:700; color:#111827; margin-bottom:8px; }
  .subtitle { font-size:14px; color:#6b7280; margin-bottom:24px; line-height:1.6; }
  .order-box { background:#f9fafb; border-radius:14px; padding:20px 24px; margin:20px 0; border:1px solid #f0f0f0; }
  .order-box-title { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:14px; }
  .order-code { font-size:22px; font-weight:800; color:#111827; margin-bottom:4px; }
  .divider { height:1px; background:#f0f0f0; margin:14px 0; }
  .item-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; }
  .item-row:not(:last-child) { border-bottom:1px solid #f3f4f6; }
  .item-name { font-size:13px; color:#374151; font-weight:500; }
  .item-qty { font-size:11px; color:#9ca3af; margin-top:2px; }
  .item-price { font-size:14px; font-weight:700; color:#ef4444; }
  .totals { margin-top:12px; }
  .total-row { display:flex; justify-content:space-between; font-size:13px; color:#6b7280; padding:4px 0; }
  .total-final { display:flex; justify-content:space-between; font-size:16px; font-weight:800; color:#111827; padding:12px 0 0; margin-top:8px; border-top:2px solid #f0f0f0; }
  .total-final span:last-child { color:#ef4444; }
  .btn { display:inline-block; background:#ef4444; color:#fff !important; padding:14px 32px; border-radius:12px; text-decoration:none; font-weight:700; font-size:15px; margin:24px 0 8px; }
  .btn-center { text-align:center; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0; }
  .info-card { background:#f9fafb; border-radius:10px; padding:14px 16px; }
  .info-label { font-size:10px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .info-value { font-size:14px; font-weight:600; color:#111827; }
  .badge { display:inline-block; padding:5px 14px; border-radius:999px; font-size:12px; font-weight:700; margin-bottom:12px; }
  .badge-green { background:#d1fae5; color:#059669; }
  .badge-blue { background:#dbeafe; color:#2563eb; }
  .badge-purple { background:#ede9fe; color:#7c3aed; }
  .badge-indigo { background:#e0e7ff; color:#4338ca; }
  .badge-red { background:#fee2e2; color:#dc2626; }
  .note-box { background:linear-gradient(135deg,#fef3c7,#fde68a); border-radius:10px; padding:14px 16px; margin:14px 0; border-left:4px solid #f59e0b; }
  .note-box p { font-size:13px; color:#92400e; font-weight:500; }
  .tracking-box { background:#f0fdf4; border-radius:10px; padding:14px 16px; margin:14px 0; border:1px solid #bbf7d0; }
  .tracking-label { font-size:11px; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .tracking-value { font-size:18px; font-weight:800; color:#065f46; font-family:monospace; }
  .footer { background:#f9fafb; padding:24px 40px; text-align:center; border-top:1px solid #f0f0f0; }
  .footer p { font-size:12px; color:#9ca3af; line-height:1.7; }
  .footer a { color:#ef4444; text-decoration:none; font-weight:600; }
  .whatsapp-btn { display:inline-block; background:#22c55e; color:#fff !important; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:600; margin-top:8px; }
`;

const wrapHTML = (content, title) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHTML(title)}</title>
  <style>${baseCSS}</style>
</head>
<body style="padding:16px;">
  <div class="wrap">
    <div class="header">
      <div class="header-logo">🛍️ MirageMart</div>
      <div class="header-sub">Tu tienda de moda favorita en Perú</div>
    </div>
    ${content}
    <div class="footer">
      <p>
        © ${new Date().getFullYear()} MirageMart — Todos los derechos reservados<br/>
        <a href="${CLIENT_URL}">www.miragemart.com</a> &nbsp;·&nbsp;
        <a href="https://wa.me/51944174400">WhatsApp</a>
      </p>
      <p style="margin-top:8px;">¿Tienes dudas? Escríbenos, estamos para ayudarte 💪</p>
    </div>
  </div>
</body>
</html>
`;

const formatPrice = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const itemsHTML = (items = []) =>
  items
    .map(
      (item) => `
    <div class="item-row">
      <div>
        <div class="item-name">${escapeHTML(item.nombre_producto || item.nombre)}</div>
        <div class="item-qty">x${escapeHTML(item.cantidad)}</div>
      </div>
      <div class="item-price">${formatPrice(item.subtotal)}</div>
    </div>
  `,
    )
    .join("");

// ─── 1. Código de verificación (6 dígitos) ────────────────────────────────────
export const sendVerificationCode = (email, nombre, codigo) =>
  send({
    to: email,
    subject: `✅ Tu código de verificación: ${codigo} — MirageMart`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Hola ${escapeHTML(nombre)}! 👋</p>
        <p class="subtitle">Gracias por registrarte en MirageMart. Usa este código para verificar tu cuenta:</p>

        <div class="order-box" style="text-align:center;">
          <div class="order-box-title">Código de verificación</div>
          <div style="font-size:36px;font-weight:800;color:#ef4444;letter-spacing:8px;margin:12px 0;">
            ${escapeHTML(codigo)}
          </div>
          <span class="badge badge-red">Expira en 10 minutos</span>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          Si no creaste esta cuenta, ignora este mensaje. Nunca compartas este código con nadie.
        </p>
      </div>
    `,
      "Tu código de verificación — MirageMart",
    ),
  });

// ─── 2. Verificación de cuenta ────────────────────────────────────────────────
export const sendVerification = (email, nombre, token) =>
  send({
    to: email,
    subject: "✅ Verifica tu cuenta — MirageMart",
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Hola ${escapeHTML(nombre)}! 👋</p>
        <p class="subtitle">Gracias por registrarte en MirageMart. Solo falta verificar tu correo para activar tu cuenta.</p>
        <div class="btn-center">
          <a href="${CLIENT_URL}/verify-email/${escapeHTML(token)}" class="btn">✅ Verificar mi cuenta</a>
        </div>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          El enlace expira en 24 horas. Si no creaste esta cuenta, ignora este mensaje.
        </p>
      </div>
    `,
      "Verifica tu cuenta — MirageMart",
    ),
  });

// ─── 3. Restablecer contraseña ────────────────────────────────────────────────
export const sendPasswordReset = (email, nombre, token) =>
  send({
    to: email,
    subject: "🔐 Restablecer contraseña — MirageMart",
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${escapeHTML(nombre)} 🔐</p>
        <p class="subtitle">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para continuar.</p>
        <div class="btn-center">
          <a href="${CLIENT_URL}/reset-password/${escapeHTML(token)}" class="btn">🔐 Restablecer contraseña</a>
        </div>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          El enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.
        </p>
      </div>
    `,
      "Restablecer contraseña — MirageMart",
    ),
  });

// ─── 4. Confirmación de pedido ────────────────────────────────────────────────
export const sendOrderConfirmation = (email, nombre, order, pdfBuffer = null) =>
  send({
    to: email,
    subject: `✅ Pedido #${escapeHTML(order.codigo_orden)} recibido — MirageMart`,
    attachments: pdfBuffer
      ? [
          {
            filename: `comprobante-${escapeHTML(order.codigo_orden)}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [],
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Hola ${escapeHTML(nombre)}! 🎉</p>
        <p class="subtitle">Recibimos tu pedido y está siendo procesado. Te notificaremos cuando sea enviado.${pdfBuffer ? " Adjuntamos tu comprobante de pedido en PDF." : ""}</p>

        <div class="order-box">
          <div class="order-box-title">Resumen del pedido</div>
          <div class="order-code">#${escapeHTML(order.codigo_orden)}</div>
          <span class="badge badge-blue">Pendiente de confirmación</span>

          ${itemsHTML(order.items)}

          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
            ${
              Number(order.descuento) > 0
                ? `<div class="total-row" style="color:#059669"><span>Descuento</span><span>-${formatPrice(order.descuento)}</span></div>`
                : ""
            }
            <div class="total-row"><span>Envío</span><span>${Number(order.costo_envio) === 0 ? "Gratis" : formatPrice(order.costo_envio)}</span></div>
            <div class="total-final"><span>Total</span><span>${formatPrice(order.total)}</span></div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Código de orden</div>
            <div class="info-value">#${escapeHTML(order.codigo_orden)}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Fecha</div>
            <div class="info-value">${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
          ${
            order.nombre_destinatario
              ? `
          <div class="info-card">
            <div class="info-label">Destinatario</div>
            <div class="info-value">${escapeHTML(order.nombre_destinatario)}</div>
          </div>`
              : ""
          }
          ${
            order.metodo_envio
              ? `
          <div class="info-card">
            <div class="info-label">Método de envío</div>
            <div class="info-value">${escapeHTML(order.metodo_envio)}</div>
          </div>`
              : ""
          }
        </div>

        <div class="btn-center">
          <a href="${CLIENT_URL}/orders/${escapeHTML(order.id)}" class="btn">Ver mi pedido →</a>
        </div>
        <div class="btn-center">
          <a href="https://wa.me/51944174400?text=Hola!%20Consulta%20sobre%20mi%20pedido%20%23${escapeHTML(order.codigo_orden)}" class="whatsapp-btn">
            💬 ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    `,
      `Pedido #${escapeHTML(order.codigo_orden)} recibido — MirageMart`,
    ),
  });

// ─── 5. Notificación de contacto (a ti, el admin) ⚠️ LA MÁS IMPORTANTE ──────
export const sendContactAdminNotification = (nombre, email, mensaje) =>
  send({
    to: MAIL_USER,
    subject: `📩 Nuevo mensaje de contacto — ${escapeHTML(nombre)}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Nuevo mensaje desde el formulario de contacto</p>
        <div class="order-box">
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Nombre</div>
              <div class="info-value">${escapeHTML(nombre)}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Email</div>
              <div class="info-value">${escapeHTML(email)}</div>
            </div>
          </div>
          <div class="divider"></div>
          <p style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.6;">${escapeHTML(mensaje)}</p>
        </div>
        <div class="btn-center">
          <a href="mailto:${email}" class="btn">Responder a ${escapeHTML(nombre)} →</a>
        </div>
      </div>
    `,
      `Nuevo mensaje de contacto — ${escapeHTML(nombre)}`,
    ),
  });
// ─── 6. Confirmación al cliente ───────────────────────────────────────────────
export const sendContactConfirmation = (nombre, email) =>
  send({
    to: email,
    subject: "✅ Recibimos tu mensaje — MirageMart",
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Hola ${escapeHTML(nombre)}! 👋</p>
        <p class="subtitle">
          Recibimos tu mensaje y nuestro equipo te responderá lo antes posible,
          normalmente dentro de las próximas 24 horas.
        </p>
        <div class="btn-center">
          <a href="https://wa.me/51907653530" class="whatsapp-btn">
            💬 ¿Es urgente? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    `,
      "Recibimos tu mensaje — MirageMart",
    ),
  });

// ─── 7. Libro de Reclamaciones — constancia al consumidor ─────────────────────
export const sendLibroReclamacionesConfirmacion = (record, pdfBuffer) =>
  send({
    to: record.email,
    subject: `✅ Constancia de tu ${record.tipo === "reclamo" ? "reclamo" : "queja"} — ${record.codigo}`,
    attachments: [
      {
        filename: `constancia-${record.codigo}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${escapeHTML(record.nombre_completo)} 👋</p>
        <p class="subtitle">
          Recibimos tu ${escapeHTML(record.tipo === "reclamo" ? "reclamo" : "queja")} y adjuntamos tu constancia en PDF.
          Te responderemos dentro de los próximos 15 días hábiles a este mismo correo.
        </p>
        <div class="order-box">
          <div class="order-box-title">Código de seguimiento</div>
          <div class="order-code">${escapeHTML(record.codigo)}</div>
        </div>
      </div>
    `,
      `Constancia de tu ${escapeHTML(record.tipo)} — ${escapeHTML(record.codigo)}`,
    ),
  });

// ─── 8. Libro de Reclamaciones — notificación al admin ─────────────────────────
export const sendLibroReclamacionesAdminNotification = (record) =>
  send({
    to: MAIL_USER,
    subject: `📋 Nuevo ${record.tipo === "reclamo" ? "reclamo" : "queja"} — ${record.codigo}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Nuevo ${record.tipo === "reclamo" ? "reclamo" : "queja"} en el Libro de Reclamaciones</p>
        <div class="note-box">
          <p>⏰ Tienes 15 días hábiles para responder desde la fecha de recepción.</p>
        </div>
        <div class="order-box">
          <div class="order-box-title">Código</div>
          <div class="order-code">${record.codigo}</div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Nombre</div>
              <div class="info-value">${escapeHTML(record.nombre_completo)}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Email</div>
              <div class="info-value">${escapeHTML(record.email)}</div>
            </div>
          </div>
          <div class="divider"></div>
          <p style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.6;"><strong>Detalle:</strong> ${escapeHTML(record.detalle)}</p>
          <p style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.6;margin-top:8px;"><strong>Pedido:</strong> ${escapeHTML(record.pedido_consumidor)}</p>
        </div>
      </div>
    `,
      `Nuevo ${record.tipo} — ${record.codigo}`,
    ),
  });

// ─── 9. Libro de Reclamaciones — respuesta al consumidor ───────────────────────
export const sendLibroReclamacionesRespuesta = (record) =>
  send({
    to: record.email,
    subject: `📬 Respuesta a tu ${record.tipo === "reclamo" ? "reclamo" : "queja"} — ${record.codigo}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${escapeHTML(record.nombre_completo)} 👋</p>
        <p class="subtitle">Aquí tienes nuestra respuesta a tu ${record.tipo === "reclamo" ? "reclamo" : "queja"} con código <strong>${record.codigo}</strong>.</p>
        <div class="order-box">
          <div class="order-box-title">Respuesta</div>
          <p style="font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.6;">${escapeHTML(record.respuesta)}</p>
        </div>
      </div>
    `,
      `Respuesta a tu ${record.tipo} — ${record.codigo}`,
    ),
  });

// ─── 10. Actualización de estado ───────────────────────────────────────────────
const STATUS_INFO = {
  pagado: {
    emoji: "✅",
    label: "Pago confirmado",
    badge: "badge-green",
    msg: "Tu pago fue confirmado exitosamente. ¡Estamos preparando tu pedido!",
  },
  preparando: {
    emoji: "📦",
    label: "En preparación",
    badge: "badge-purple",
    msg: "Estamos empacando tu pedido con mucho cuidado.",
  },
  enviado: {
    emoji: "🚚",
    label: "En camino",
    badge: "badge-indigo",
    msg: "¡Tu pedido está en camino! Pronto llegará a tus manos.",
  },
  entregado: {
    emoji: "🎉",
    label: "Entregado",
    badge: "badge-green",
    msg: "Tu pedido fue entregado. ¡Esperamos que lo disfrutes!",
  },
  cancelado: {
    emoji: "❌",
    label: "Cancelado",
    badge: "badge-red",
    msg: "Tu pedido fue cancelado. Si tienes dudas contáctanos.",
  },
};

export const sendOrderStatus = (email, nombre, order, estado, comentario) => {
  const info = STATUS_INFO[estado] || {
    emoji: "📋",
    label: estado,
    badge: "badge-blue",
    msg: "El estado de tu pedido fue actualizado.",
  };
  const COURIER_TRACKING_URLS = {
    Shalom: "https://rastrea.shalom.pe/",
    "Olva Courier": "https://tracking.olvaexpress.pe/",
  };

  return send({
    to: email,
    subject: `${info.emoji} Pedido #${escapeHTML(order.codigo_orden)} — ${info.label} — MirageMart`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${escapeHTML(nombre)} ${info.emoji}</p>
        <p class="subtitle">${info.msg}</p>

        <div class="order-box">
          <div class="order-box-title">Estado del pedido</div>
          <div class="order-code">#${escapeHTML(order.codigo_orden)}</div>
          <span class="badge ${info.badge}">${info.label}</span>

          ${
            comentario
              ? `
            <div class="note-box">
              <p>💬 <strong>Nota:</strong> ${escapeHTML(comentario)}</p>
            </div>
          `
              : ""
          }
          ${
            estado === "enviado" && order.tracking_number
              ? `
          <div class="tracking-box">
            <div class="tracking-label">${order.courier ? `Enviado por ${escapeHTML(order.courier)}` : "Número de tracking"}</div>
            <div class="tracking-value">${escapeHTML(order.tracking_number)}</div>
            ${
              order.fecha_envio
                ? `<p style="font-size:12px;color:#059669;margin-top:8px;">Fecha de envío: ${new Date(order.fecha_envio).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>`
                : ""
            }
            ${
              order.clave_recojo
                ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid #bbf7d0;">
                <div class="tracking-label">Clave de recojo</div>
                <div class="tracking-value">${escapeHTML(order.clave_recojo)}</div>
                <p style="font-size:12px;color:#059669;margin-top:6px;">
                  Preséntala junto a tu DNI en la agencia para retirar tu pedido.
                </p>
              </div>
            `
                : ""
            }
            ${
              COURIER_TRACKING_URLS[order.courier]
                ? `
              <div style="text-align:center;margin-top:14px;">
                <a href="${COURIER_TRACKING_URLS[order.courier]}" style="display:inline-block;background:#4f46e5;color:#fff !important;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">
                  🚚 Rastrear envío
                </a>
              </div>
            `
                : ""
            }
          </div>
          `
              : ""
          }
        </div>

        ${
          estado === "entregado"
            ? `
          <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
            <p style="font-size:14px;color:#92400e;font-weight:600;">
              ⭐ ¿Te gustó tu compra? Deja una reseña y ayuda a otros compradores
            </p>
          </div>
        `
            : ""
        }

        <div class="btn-center">
          <a href="${CLIENT_URL}/orders/${escapeHTML(order.id)}" class="btn">Ver seguimiento →</a>
        </div>
        <div class="btn-center">
          <a href="https://wa.me/51944174400?text=Hola!%20Consulta%20sobre%20mi%20pedido%20%23${escapeHTML(order.codigo_orden)}" class="whatsapp-btn">
            💬 ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    `,
      `Pedido ${info.label} — MirageMart`,
    ),
  });
};

// ─── 10. Solicitud de reembolso recibida (al cliente) ─────────────────────────
export const sendRefundRequestReceived = (email, nombre, order) =>
  send({
    to: email,
    subject: `📋 Recibimos tu solicitud de reembolso — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${nombre} 👋</p>
        <p class="subtitle">
          Recibimos tu solicitud de reembolso para el pedido <strong>#${order.codigo_orden}</strong>.
          Nuestro equipo la revisará y te notificaremos por este medio en cuanto tengamos una respuesta.
        </p>
        <div class="order-box">
          <div class="order-box-title">Pedido</div>
          <div class="order-code">#${order.codigo_orden}</div>
          <span class="badge badge-blue">Solicitud en revisión</span>
        </div>
      </div>
    `,
      "Solicitud de reembolso recibida — MirageMart",
    ),
  });

// ─── 11. Notificación al admin de nueva solicitud ─────────────────────────────
export const sendRefundRequestAdminNotification = (order, motivo, comentario) =>
  send({
    to: MAIL_USER,
    subject: `⚠️ Nueva solicitud de reembolso — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Nueva solicitud de reembolso</p>
        <div class="order-box">
          <div class="order-box-title">Pedido</div>
          <div class="order-code">#${order.codigo_orden}</div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Cliente</div>
              <div class="info-value">${order.cliente_nombre}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Motivo</div>
              <div class="info-value">${motivo}</div>
            </div>
          </div>
          ${comentario ? `<div class="divider"></div><p style="font-size:13px;color:#374151;white-space:pre-wrap;">${comentario}</p>` : ""}
        </div>
        <div class="btn-center">
          <a href="${CLIENT_URL}/admin/refund-requests" class="btn">Revisar solicitud →</a>
        </div>
      </div>
    `,
      `Nueva solicitud de reembolso — #${order.codigo_orden}`,
    ),
  });

// ─── 12. Solicitud aprobada (al cliente) ──────────────────────────────────────
export const sendRefundRequestApproved = (email, nombre, order, monto) =>
  send({
    to: email,
    subject: `✅ Tu reembolso fue aprobado — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Buenas noticias, ${nombre}! 🎉</p>
        <p class="subtitle">
          Tu solicitud de reembolso para el pedido <strong>#${order.codigo_orden}</strong> fue aprobada.
          El monto será devuelto a tu método de pago original.
        </p>
        <div class="order-box">
          <div class="order-box-title">Monto reembolsado</div>
          <div class="order-code">${formatPrice(monto)}</div>
          <span class="badge badge-green">Reembolso procesado</span>
        </div>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          Algunos bancos pueden tardar entre 15 y 30 días en reflejar el reembolso en tu estado de cuenta.
        </p>
      </div>
    `,
      "Reembolso aprobado — MirageMart",
    ),
  });

// ─── 13. Solicitud rechazada (al cliente) ─────────────────────────────────────
export const sendRefundRequestRejected = (email, nombre, order, respuesta) =>
  send({
    to: email,
    subject: `Actualización sobre tu solicitud de reembolso — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${nombre}</p>
        <p class="subtitle">
          Revisamos tu solicitud de reembolso para el pedido <strong>#${order.codigo_orden}</strong>
          y, lamentablemente, no pudimos aprobarla.
        </p>
        ${
          respuesta
            ? `<div class="note-box"><p>💬 <strong>Motivo:</strong> ${respuesta}</p></div>`
            : ""
        }
        <div class="btn-center">
          <a href="https://wa.me/51944174400" class="whatsapp-btn">
            💬 ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    `,
      "Actualización de tu solicitud de reembolso — MirageMart",
    ),
  });

// ─── 14. Devolución: solicitud recibida (cliente) ─────────────────────────────
export const sendReturnRequestReceived = (email, nombre, order, item) =>
  send({
    to: email,
    subject: `📦 Recibimos tu solicitud de devolución — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${nombre} 👋</p>
        <p class="subtitle">
          Recibimos tu solicitud de devolución para <strong>${item.nombre_producto}</strong>
          del pedido <strong>#${order.codigo_orden}</strong>. La revisaremos pronto.
        </p>
        <div class="order-box">
          <div class="order-box-title">Producto</div>
          <div class="order-code">${item.nombre_producto}</div>
          <span class="badge badge-blue">Solicitud en revisión</span>
        </div>
      </div>
    `,
      "Solicitud de devolución recibida — MirageMart",
    ),
  });

// ─── 15. Devolución: notificación al admin ────────────────────────────────────
export const sendReturnRequestAdminNotification = (
  order,
  item,
  motivo,
  comentario,
) =>
  send({
    to: MAIL_USER,
    subject: `📦 Nueva solicitud de devolución — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Nueva solicitud de devolución</p>
        <div class="order-box">
          <div class="order-box-title">Producto</div>
          <div class="order-code">${item.nombre_producto}</div>
          <div class="divider"></div>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Cliente</div>
              <div class="info-value">${order.cliente_nombre}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Motivo</div>
              <div class="info-value">${motivo}</div>
            </div>
          </div>
          ${comentario ? `<div class="divider"></div><p style="font-size:13px;color:#374151;white-space:pre-wrap;">${comentario}</p>` : ""}
        </div>
        <div class="btn-center">
          <a href="${CLIENT_URL}/admin/return-requests" class="btn">Revisar solicitud →</a>
        </div>
      </div>
    `,
      `Nueva devolución — #${order.codigo_orden}`,
    ),
  });

// ─── 16. Devolución: aprobada, con instrucciones de envío (cliente) ───────────
export const sendReturnRequestApproved = (
  email,
  nombre,
  order,
  instrucciones,
) =>
  send({
    to: email,
    subject: `✅ Devolución aprobada — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Buenas noticias, ${nombre}! 📦</p>
        <p class="subtitle">
          Tu solicitud de devolución para el pedido <strong>#${order.codigo_orden}</strong> fue aprobada.
          Por favor, envía el producto siguiendo estas instrucciones:
        </p>
        <div class="note-box">
          <p>${instrucciones || "Nos pondremos en contacto contigo por WhatsApp para coordinar el envío del producto."}</p>
        </div>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          Una vez que recibamos el producto y verifiquemos su estado, procesaremos tu reembolso.
        </p>
      </div>
    `,
      "Devolución aprobada — MirageMart",
    ),
  });

// ─── 17. Devolución: rechazada (cliente) ──────────────────────────────────────
export const sendReturnRequestRejected = (email, nombre, order, respuesta) =>
  send({
    to: email,
    subject: `Actualización sobre tu devolución — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">Hola ${nombre}</p>
        <p class="subtitle">
          Revisamos tu solicitud de devolución para el pedido <strong>#${order.codigo_orden}</strong>
          y, lamentablemente, no pudimos aprobarla.
        </p>
        ${respuesta ? `<div class="note-box"><p>💬 <strong>Motivo:</strong> ${respuesta}</p></div>` : ""}
        <div class="btn-center">
          <a href="https://wa.me/51944174400" class="whatsapp-btn">💬 ¿Dudas? Escríbenos por WhatsApp</a>
        </div>
      </div>
    `,
      "Actualización de tu devolución — MirageMart",
    ),
  });

// ─── 18. Devolución: reembolso confirmado tras recibir el producto (cliente) ──
export const sendReturnRefundConfirmed = (email, nombre, order, monto) =>
  send({
    to: email,
    subject: `✅ Devolución completada — Pedido #${order.codigo_orden}`,
    html: wrapHTML(
      `
      <div class="body">
        <p class="greeting">¡Listo, ${nombre}! 🎉</p>
        <p class="subtitle">
          Recibimos tu producto en buenas condiciones y ya procesamos tu reembolso.
        </p>
        <div class="order-box">
          <div class="order-box-title">Monto reembolsado</div>
          <div class="order-code">${formatPrice(monto)}</div>
          <span class="badge badge-green">Reembolso procesado</span>
        </div>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
          Algunos bancos pueden tardar entre 15 y 30 días en reflejar el reembolso.
        </p>
      </div>
    `,
      "Devolución completada — MirageMart",
    ),
  });
