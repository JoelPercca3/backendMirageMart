// utils/dateFormatter.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import "dayjs/locale/es.js";

// Configurar plugins y locale
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

/**
 * Formatea timestamp de Culqi (segundos) usando dayjs
 * @param {number} timestamp - Timestamp en segundos desde 1970
 * @param {string} format - Formato de salida (opcional)
 * @returns {string} Fecha formateada
 */
const formatCulqiDate = (timestamp, format = "DD/MM/YYYY, h:mm:ss a") => {
  if (!timestamp) return "Fecha no disponible";
  return dayjs.unix(timestamp).tz("America/Lima").format(format);
};

// Formatos predefinidos
export const DATE_FORMATS = {
  datetime: "DD/MM/YYYY, h:mm:ss a",
  date: "DD/MM/YYYY",
  time: "h:mm:ss a",
  full: "dddd, D [de] MMMM [de] YYYY, h:mm:ss a",
  iso: "YYYY-MM-DD HH:mm:ss",
  mysql: "YYYY-MM-DD HH:mm:ss",
};

// Helpers
export const formatDateTime = (timestamp) => {
  if (!timestamp) return "Fecha no disponible";

  // Asegurarse de que es un número
  const ts = Number(timestamp);
  if (isNaN(ts) || ts === 0) return "Fecha no disponible";

  // dayjs maneja segundos con unix()
  return dayjs.unix(ts).tz("America/Lima").format("DD/MM/YYYY, h:mm:ss a");
};

export const parseCreationDate = (creation_date) => {
  if (!creation_date) return null;
  const num = Number(creation_date);
  const ms = num > 1e12 ? num : num * 1000;
  return new Date(ms);
};
export const formatDate = (timestamp) =>
  formatCulqiDate(timestamp, DATE_FORMATS.date);

export const formatTime = (timestamp) =>
  formatCulqiDate(timestamp, DATE_FORMATS.time);

export const formatFull = (timestamp) =>
  formatCulqiDate(timestamp, DATE_FORMATS.full);

// Para guardar en MySQL
export const culqiToMySQL = (timestamp) => {
  if (!timestamp) return null;
  return dayjs.unix(timestamp).tz("America/Lima").format(DATE_FORMATS.mysql);
};

// También exportamos la función principal
export { formatCulqiDate };
