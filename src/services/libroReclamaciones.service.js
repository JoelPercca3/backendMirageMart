// src/services/libroReclamaciones.service.js
//
// Genera la Hoja de Reclamación (constancia) según los campos del Anexo I
// del Reglamento del Libro de Reclamaciones (D.S. 011-2011-PCM), y entrega
// la constancia de inmediato al consumidor por email (según exige la norma).
//
// Datos del establecimiento — verifica que sean exactos antes de producción:
const ESTABLECIMIENTO = {
  razonSocial: "PERCCA CUADROS JOEL",
  ruc: "10757729402",
  direccion: "Av 9 de Diciembre y Av Los Incas, Chilca, Huancayo, Junín, Perú",
  nombreComercial: "MirageMart",
};

import PDFDocument from "pdfkit";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import * as libroRepo from "../repositories/libroReclamaciones.repository.js";
import {
  sendLibroReclamacionesConfirmacion,
  sendLibroReclamacionesAdminNotification,
  sendLibroReclamacionesRespuesta,
} from "./email.service.js";

const PAGE_WIDTH = 515;
const MARGIN_X = 40;

// ── Código correlativo: LR-{año}-{id con padding} ──────────────────────────
const buildCodigo = (id) => {
  const year = new Date().getFullYear();
  return `LR-${year}-${String(id).padStart(6, "0")}`;
};

// ── Suma N días hábiles (lunes a viernes) a una fecha ──────────────────────
// Nota: no descuenta feriados oficiales peruanos, solo fines de semana.
// Para exactitud total del plazo legal, verifica contra el calendario de
// feriados vigente antes de comunicar la fecha límite como definitiva.
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

// ── Genera el PDF de la constancia (Hoja de Reclamación) ───────────────────
const generateConstanciaPDF = (record) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const fechaLimite = addBusinessDays(
        new Date(record.created_at || Date.now()),
        15,
      );

      // Header
      doc
        .fillColor("#ef4444")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(ESTABLECIMIENTO.nombreComercial, MARGIN_X, 40);
      doc
        .fillColor("#111827")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(
          "HOJA DE RECLAMACIÓN — LIBRO DE RECLAMACIONES VIRTUAL",
          MARGIN_X,
          66,
        );
      doc
        .fillColor("#9ca3af")
        .fontSize(9)
        .font("Helvetica")
        .text(`Código: ${record.codigo}`, MARGIN_X, 84);

      // Identificación del establecimiento
      let y = 112;
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Identificación del proveedor", MARGIN_X, y);
      y += 16;
      doc.fillColor("#374151").fontSize(9).font("Helvetica");
      doc.text(`Razón social: ${ESTABLECIMIENTO.razonSocial}`, MARGIN_X, y);
      y += 13;
      doc.text(`RUC: ${ESTABLECIMIENTO.ruc}`, MARGIN_X, y);
      y += 13;
      doc.text(
        `Nombre comercial: ${ESTABLECIMIENTO.nombreComercial}`,
        MARGIN_X,
        y,
      );
      y += 13;
      doc.text(`Dirección: ${ESTABLECIMIENTO.direccion}`, MARGIN_X, y);
      y += 20;

      // Identificación del consumidor
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Identificación del consumidor", MARGIN_X, y);
      y += 16;
      doc.fillColor("#374151").fontSize(9).font("Helvetica");
      doc.text(`Nombre completo: ${record.nombre_completo}`, MARGIN_X, y);
      y += 13;
      if (record.tipo_documento && record.numero_documento) {
        doc.text(
          `Documento: ${record.tipo_documento} ${record.numero_documento}`,
          MARGIN_X,
          y,
        );
        y += 13;
      }
      doc.text(`Email: ${record.email}`, MARGIN_X, y);
      y += 13;
      if (record.telefono) {
        doc.text(`Teléfono: ${record.telefono}`, MARGIN_X, y);
        y += 13;
      }
      if (record.domicilio) {
        doc.text(`Domicilio: ${record.domicilio}`, MARGIN_X, y, {
          width: PAGE_WIDTH,
        });
        y += 13;
      }
      if (record.es_menor_edad) {
        doc.text(
          `Menor de edad — Padre/Madre/Apoderado: ${record.nombre_apoderado || "-"}`,
          MARGIN_X,
          y,
          { width: PAGE_WIDTH },
        );
        y += 13;
      }
      y += 7;

      // Bien contratado
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Identificación del bien contratado", MARGIN_X, y);
      y += 16;
      doc.fillColor("#374151").fontSize(9).font("Helvetica");
      if (record.numero_pedido) {
        doc.text(`N.º de pedido: ${record.numero_pedido}`, MARGIN_X, y);
        y += 13;
      }
      doc.text(
        `Producto/servicio: ${record.bien_contratado || "No especificado"}`,
        MARGIN_X,
        y,
        { width: PAGE_WIDTH },
      );
      y += 13;
      if (record.monto_reclamado) {
        doc.text(
          `Monto reclamado: S/ ${Number(record.monto_reclamado).toFixed(2)}`,
          MARGIN_X,
          y,
        );
        y += 13;
      }
      y += 7;

      // Tipo
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(
          `Tipo: ${record.tipo === "reclamo" ? "RECLAMO" : "QUEJA"}`,
          MARGIN_X,
          y,
        );
      y += 20;

      // Detalle
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Detalle de la reclamación", MARGIN_X, y);
      y += 14;
      doc
        .fillColor("#374151")
        .fontSize(9)
        .font("Helvetica")
        .text(record.detalle, MARGIN_X, y, { width: PAGE_WIDTH });
      y += doc.heightOfString(record.detalle, { width: PAGE_WIDTH }) + 16;

      // Pedido del consumidor
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Pedido del consumidor", MARGIN_X, y);
      y += 14;
      doc
        .fillColor("#374151")
        .fontSize(9)
        .font("Helvetica")
        .text(record.pedido_consumidor, MARGIN_X, y, { width: PAGE_WIDTH });
      y +=
        doc.heightOfString(record.pedido_consumidor, { width: PAGE_WIDTH }) +
        16;

      // Observaciones y acciones del proveedor
      doc
        .fillColor("#111827")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(
          "Observaciones y acciones adoptadas por el proveedor",
          MARGIN_X,
          y,
        );
      y += 14;
      doc
        .fillColor("#374151")
        .fontSize(9)
        .font("Helvetica")
        .text(record.respuesta || "(Pendiente de respuesta)", MARGIN_X, y, {
          width: PAGE_WIDTH,
        });
      y += 30;

      // Plazo legal
      doc.rect(MARGIN_X, y, PAGE_WIDTH, 34).fill("#fef3c7");
      doc
        .fillColor("#92400e")
        .fontSize(8)
        .font("Helvetica")
        .text(
          `El proveedor debe responder en un plazo máximo de 15 días hábiles. Fecha límite estimada: ${fechaLimite.toLocaleDateString("es-PE")}.`,
          MARGIN_X + 10,
          y + 10,
          { width: PAGE_WIDTH - 20 },
        );

      // Footer
      doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .font("Helvetica")
        .text(
          "Documento generado conforme al D.S. N.° 011-2011-PCM — Reglamento del Libro de Reclamaciones.",
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

// ── Crear un nuevo reclamo/queja ────────────────────────────────────────────
export const create = async (data) => {
  const insertId = await libroRepo.create(data);
  const codigo = buildCodigo(insertId);
  await libroRepo.setCodigo(insertId, codigo);

  const record = await libroRepo.findById(insertId);
  const pdfBuffer = await generateConstanciaPDF(record);

  // Entrega inmediata al consumidor (obligatorio por norma) + notificación
  // al proveedor. Ninguno bloquea la respuesta si falla el envío.
  await Promise.all([
    sendLibroReclamacionesConfirmacion(record, pdfBuffer).catch((err) =>
      console.error("Error al enviar constancia de reclamo:", err),
    ),
    sendLibroReclamacionesAdminNotification(record).catch((err) =>
      console.error("Error al notificar reclamo al admin:", err),
    ),
  ]);

  return { codigo, id: insertId };
};

export const getConstancia = async (codigo, email) => {
  const record = await libroRepo.findByCodigoAndEmail(codigo, email);
  if (!record) throw new AppError("Registro no encontrado", 404);
  const buffer = await generateConstanciaPDF(record);
  return { buffer, filename: `constancia-${record.codigo}.pdf` };
};

export const getAll = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const offset = (page - 1) * limit;

  const { rows, total } = await libroRepo.getAll({
    limit,
    offset,
    search: query.search,
    estado: query.estado,
    tipo: query.tipo,
  });

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getOne = async (id) => {
  const record = await libroRepo.findById(id);
  if (!record) throw new AppError("Registro no encontrado", 404);
  return record;
};

export const respond = async (id, respuesta) => {
  const record = await libroRepo.findById(id);
  if (!record) throw new AppError("Registro no encontrado", 404);

  await libroRepo.respond(id, respuesta);
  const updated = await libroRepo.findById(id);

  await sendLibroReclamacionesRespuesta(updated).catch((err) =>
    console.error("Error al notificar respuesta de reclamo:", err),
  );

  return updated;
};
