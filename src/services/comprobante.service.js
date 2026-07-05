// src/services/comprobante.service.js
//
// Genera un "Comprobante de Pedido" en PDF — un documento informativo
// para el cliente, NO un comprobante de pago fiscal (boleta/factura
// electrónica SUNAT). Mientras MirageMart no esté formalizado como
// emisor electrónico, este es el documento correcto a emitir.
//
// Cuando formalices con SUNAT (RUC + registro SEE + un PSE/OSE como
// Nubefact), este servicio se puede reemplazar o extender para generar
// el comprobante fiscal real con serie/correlativo timbrado.

import PDFDocument from "pdfkit";

const formatPrice = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const PAGE_WIDTH = 515; // ancho útil (A4 - márgenes de 40 a cada lado)
const MARGIN_X = 40;

export const generateComprobantePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ──────────────────────────────────────────────────────
      doc
        .fillColor("#ef4444")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("MirageMart", MARGIN_X, 40);

      doc
        .fillColor("#6b7280")
        .fontSize(9)
        .font("Helvetica")
        .text("Tu tienda de moda favorita en Perú", MARGIN_X, 66);

      doc
        .fillColor("#111827")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("COMPROBANTE DE PEDIDO", MARGIN_X, 96);

      doc
        .fillColor("#9ca3af")
        .fontSize(9)
        .font("Helvetica")
        .text(`N.° de pedido: ${order.codigo_orden}`, MARGIN_X, 114);

      // ── Disclaimer (importante: deja claro que NO es fiscal) ────────
      doc.rect(MARGIN_X, 134, PAGE_WIDTH, 32).fill("#fef3c7");
      doc
        .fillColor("#92400e")
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Este documento es un comprobante interno de tu pedido y no constituye un comprobante de pago válido ante SUNAT.",
          MARGIN_X + 10,
          144,
          { width: PAGE_WIDTH - 20 },
        );

      // ── Datos del cliente / pedido ───────────────────────────────────
      let y = 186;
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Datos del cliente", MARGIN_X, y);

      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Datos del pedido", MARGIN_X + 280, y);

      y += 16;
      doc.fontSize(9).font("Helvetica").fillColor("#374151");

      const fechaOrden = new Date(
        order.created_at || Date.now(),
      ).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const clienteLines = [
        `Nombre: ${order.cliente_nombre || "-"}`,
        `Email: ${order.cliente_email || "-"}`,
        order.nombre_destinatario
          ? `Destinatario: ${order.nombre_destinatario}`
          : null,
      ].filter(Boolean);

      const pedidoLines = [
        `Fecha: ${fechaOrden}`,
        `Código: ${order.codigo_orden}`,
        order.metodo_envio ? `Envío: ${order.metodo_envio}` : null,
      ].filter(Boolean);

      const maxLines = Math.max(clienteLines.length, pedidoLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (clienteLines[i])
          doc.text(clienteLines[i], MARGIN_X, y, { width: 260 });
        if (pedidoLines[i])
          doc.text(pedidoLines[i], MARGIN_X + 280, y, { width: 235 });
        y += 14;
      }

      if (order.calle) {
        const direccion = [
          order.calle,
          order.ciudad,
          order.departamento,
          order.pais,
        ]
          .filter(Boolean)
          .join(", ");
        doc.text(`Dirección de envío: ${direccion}`, MARGIN_X, y, {
          width: PAGE_WIDTH,
        });
        y += 18;
      } else {
        y += 4;
      }

      // ── Tabla de productos ────────────────────────────────────────────
      const tableTop = y + 10;
      doc.rect(MARGIN_X, tableTop, PAGE_WIDTH, 20).fill("#111827");
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("PRODUCTO", MARGIN_X + 8, tableTop + 6);
      doc.text("CANT.", MARGIN_X + 300, tableTop + 6, {
        width: 40,
        align: "center",
      });
      doc.text("P. UNIT.", MARGIN_X + 340, tableTop + 6, {
        width: 80,
        align: "right",
      });
      doc.text("SUBTOTAL", MARGIN_X + 420, tableTop + 6, {
        width: 95,
        align: "right",
      });

      let rowY = tableTop + 20;
      const rowHeight = 20;
      doc.font("Helvetica").fontSize(9);

      (order.items || []).forEach((item, i) => {
        if (i % 2 === 1) {
          doc.rect(MARGIN_X, rowY, PAGE_WIDTH, rowHeight).fill("#f9fafb");
        }
        doc.fillColor("#374151");
        const nombre = item.nombre_producto || item.nombre || "Producto";
        doc.text(nombre, MARGIN_X + 8, rowY + 5, {
          width: 285,
          height: rowHeight,
          ellipsis: true,
        });
        doc.text(String(item.cantidad), MARGIN_X + 300, rowY + 5, {
          width: 40,
          align: "center",
        });
        doc.text(formatPrice(item.precio_unitario), MARGIN_X + 340, rowY + 5, {
          width: 80,
          align: "right",
        });
        doc.text(formatPrice(item.subtotal), MARGIN_X + 420, rowY + 5, {
          width: 95,
          align: "right",
        });
        rowY += rowHeight;
      });

      doc
        .moveTo(MARGIN_X, rowY)
        .lineTo(MARGIN_X + PAGE_WIDTH, rowY)
        .strokeColor("#e5e7eb")
        .stroke();

      // ── Totales ────────────────────────────────────────────────────
      let totalsY = rowY + 14;
      const totalLine = (label, value, bold = false) => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(bold ? 12 : 9)
          .fillColor(bold ? "#111827" : "#6b7280")
          .text(label, MARGIN_X + 340, totalsY, { width: 80, align: "right" })
          .text(value, MARGIN_X + 420, totalsY, { width: 95, align: "right" });
        totalsY += bold ? 20 : 15;
      };

      totalLine("Subtotal", formatPrice(order.subtotal));
      if (Number(order.descuento) > 0) {
        totalLine("Descuento", `-${formatPrice(order.descuento)}`);
      }
      totalLine(
        "Envío",
        Number(order.costo_envio) === 0
          ? "Gratis"
          : formatPrice(order.costo_envio),
      );

      doc
        .moveTo(MARGIN_X + 340, totalsY)
        .lineTo(MARGIN_X + PAGE_WIDTH, totalsY)
        .strokeColor("#e5e7eb")
        .stroke();
      totalsY += 6;

      totalLine("TOTAL", formatPrice(order.total), true);

      // ── Footer ─────────────────────────────────────────────────────
      doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .font("Helvetica")
        .text(
          "Este comprobante es únicamente informativo y no reemplaza una boleta o factura electrónica emitida ante SUNAT.\n" +
            "MirageMart — www.miragemart.com",
          MARGIN_X,
          780,
          { width: PAGE_WIDTH, align: "center" },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
