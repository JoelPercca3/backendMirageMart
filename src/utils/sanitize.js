// src/utils/sanitize.js

// ─── ESCAPE HTML ──────────────────────────────────────────────────────────────

/**
 * Escapa HTML para insertar de forma segura texto dinámico
 * dentro de plantillas de email o cualquier HTML generado en backend.
 * Convierte <, >, &, ", ' en sus entidades HTML — así el navegador
 * o cliente de correo los muestra como texto plano, no como código.
 */
export const escapeHTML = (str) => {
  if (str === null || str === undefined) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  return String(str).replace(/[&<>"'`=/]/g, (char) => map[char]);
};

// ─── UNESCAPE HTML ────────────────────────────────────────────────────────────

/**
 * Desescapa entidades HTML a su representación original
 * Útil para procesar datos que fueron escapados previamente
 */
export const unescapeHTML = (str) => {
  if (str === null || str === undefined) return "";
  const map = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
  };
  return String(str).replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;|&#x60;|&#x3D;/g,
    (char) => map[char],
  );
};

// ─── ESCAPE ATTRIBUTE ─────────────────────────────────────────────────────────

/**
 * Escapa específicamente para atributos HTML
 * Previene inyecciones en atributos como href, src, etc.
 */
export const escapeAttribute = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

// ─── SANITIZE URL ─────────────────────────────────────────────────────────────

/**
 * Sanitiza una URL para asegurar que solo use protocolos seguros
 * Previene ataques como javascript: o data: que podrían ejecutar código
 */
export const sanitizeUrl = (url) => {
  if (!url) return "";
  const sanitized = String(url).trim();

  // Lista de protocolos permitidos (seguros)
  const allowedProtocols = /^(https?:\/\/|mailto:|tel:)/i;

  if (allowedProtocols.test(sanitized)) {
    return sanitized;
  }

  // Si no es una URL válida con protocolo seguro, retornamos vacío
  return "";
};

// ─── VALIDATE EMAIL ───────────────────────────────────────────────────────────

/**
 * Valida si un email tiene formato correcto
 * Retorna true si es válido, false si no
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  // Expresión regular para validar email
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// ─── SANITIZE EMAIL ───────────────────────────────────────────────────────────

/**
 * Sanitiza un email: lo limpia y valida
 * Retorna el email sanitizado o null si es inválido
 */
export const sanitizeEmail = (email) => {
  if (!email) return null;
  const clean = String(email).trim().toLowerCase();
  return isValidEmail(clean) ? clean : null;
};

// ─── LIMIT LENGTH ─────────────────────────────────────────────────────────────

/**
 * Limita la longitud de un string para prevenir DoS (Denial of Service)
 * @param {string} str - El string a limitar
 * @param {number} maxLength - Longitud máxima permitida (por defecto 1000)
 * @returns {string} - String truncado
 */
export const limitLength = (str, maxLength = 1000) => {
  if (!str) return "";
  const clean = String(str).trim();
  return clean.length > maxLength
    ? clean.substring(0, maxLength) + "..."
    : clean;
};

// ─── SANITIZE INPUT ──────────────────────────────────────────────────────────

/**
 * Sanitiza entrada general: escapa HTML, limpia espacios y limita longitud
 * @param {string} str - El string a sanitizar
 * @param {number} maxLength - Longitud máxima permitida (por defecto 1000)
 * @returns {string} - String sanitizado y limitado
 */
export const sanitizeInput = (str, maxLength = 1000) => {
  if (!str) return "";
  const clean = String(str).trim();
  const limited = limitLength(clean, maxLength);
  return escapeHTML(limited);
};

// ─── SANITIZE PHONE ───────────────────────────────────────────────────────────

/**
 * Sanitiza un número de teléfono: elimina caracteres no numéricos
 * @param {string} phone - El teléfono a sanitizar
 * @returns {string} - Teléfono solo con números
 */
export const sanitizePhone = (phone) => {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
};

// ─── VALIDATE PHONE ──────────────────────────────────────────────────────────

/**
 * Valida si un teléfono tiene un formato válido (mínimo 7 dígitos)
 * @param {string} phone - El teléfono a validar
 * @returns {boolean} - true si es válido
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const clean = sanitizePhone(phone);
  return clean.length >= 7 && clean.length <= 15;
};

// ─── SANITIZE TEXT ────────────────────────────────────────────────────────────

/**
 * Sanitiza texto plano: elimina etiquetas HTML y caracteres peligrosos
 * @param {string} str - El texto a sanitizar
 * @returns {string} - Texto plano seguro
 */
export const sanitizeText = (str) => {
  if (!str) return "";
  // Eliminar etiquetas HTML
  const withoutTags = String(str).replace(/<[^>]*>/g, "");
  // Eliminar caracteres de control
  const clean = withoutTags.replace(/[\x00-\x1F\x7F]/g, "");
  return clean.trim();
};

// ─── SANITIZE SLUG ────────────────────────────────────────────────────────────

/**
 * Convierte un string en un slug amigable para URLs
 * @param {string} str - El texto a convertir
 * @returns {string} - Slug seguro para URLs
 */
export const sanitizeSlug = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Eliminar caracteres especiales
    .replace(/[\s_-]+/g, "-") // Reemplazar espacios y guiones bajos con guiones
    .replace(/^-+|-+$/g, ""); // Eliminar guiones al inicio y final
};

// ─── SANITIZE BOOLEAN ────────────────────────────────────────────────────────

/**
 * Convierte un valor a booleano de forma segura
 * @param {any} value - El valor a convertir
 * @returns {boolean} - Valor booleano
 */
export const sanitizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return (
      lower === "true" || lower === "1" || lower === "yes" || lower === "on"
    );
  }
  return Boolean(value);
};

// ─── SANITIZE NUMBER ──────────────────────────────────────────────────────────

/**
 * Convierte un valor a número de forma segura
 * @param {any} value - El valor a convertir
 * @param {number} defaultValue - Valor por defecto si falla
 * @returns {number} - Número válido
 */
export const sanitizeNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// ─── SANITIZE ARRAY ──────────────────────────────────────────────────────────

/**
 * Sanitiza un array: limpia cada elemento usando sanitizeInput
 * @param {array} arr - El array a sanitizar
 * @param {number} maxLength - Longitud máxima por elemento
 * @returns {array} - Array sanitizado
 */
export const sanitizeArray = (arr, maxLength = 1000) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === "string") {
      return sanitizeInput(item, maxLength);
    }
    if (typeof item === "number") {
      return sanitizeNumber(item);
    }
    if (typeof item === "boolean") {
      return sanitizeBoolean(item);
    }
    if (item === null || item === undefined) {
      return "";
    }
    return item;
  });
};

// ─── SANITIZE OBJECT ─────────────────────────────────────────────────────────

/**
 * Sanitiza un objeto: limpia todos sus valores string
 * @param {object} obj - El objeto a sanitizar
 * @param {number} maxLength - Longitud máxima por string
 * @returns {object} - Objeto sanitizado
 */
export const sanitizeObject = (obj, maxLength = 1000) => {
  if (!obj || typeof obj !== "object") return {};

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeInput(value, maxLength);
    } else if (Array.isArray(value)) {
      result[key] = sanitizeArray(value, maxLength);
    } else if (value && typeof value === "object") {
      result[key] = sanitizeObject(value, maxLength);
    } else if (typeof value === "number") {
      result[key] = sanitizeNumber(value);
    } else if (typeof value === "boolean") {
      result[key] = sanitizeBoolean(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// ─── VALIDATE REQUIRED ──────────────────────────────────────────────────────

/**
 * Valida que un campo requerido no esté vacío
 * @param {any} value - El valor a validar
 * @returns {boolean} - true si tiene valor
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

// ─── VALIDATE MIN LENGTH ────────────────────────────────────────────────────

/**
 * Valida que un string tenga una longitud mínima
 * @param {string} str - El string a validar
 * @param {number} min - Longitud mínima
 * @returns {boolean} - true si cumple
 */
export const isValidMinLength = (str, min = 1) => {
  if (!str) return false;
  return String(str).trim().length >= min;
};

// ─── VALIDATE MAX LENGTH ────────────────────────────────────────────────────

/**
 * Valida que un string tenga una longitud máxima
 * @param {string} str - El string a validar
 * @param {number} max - Longitud máxima
 * @returns {boolean} - true si cumple
 */
export const isValidMaxLength = (str, max = 1000) => {
  if (!str) return true;
  return String(str).trim().length <= max;
};

// ─── SANITIZE PASSWORD ──────────────────────────────────────────────────────

/**
 * Valida que una contraseña sea segura
 * @param {string} password - La contraseña a validar
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }

  if (password && password.length > 72) {
    errors.push("La contraseña no debe exceder los 72 caracteres");
  }

  // Opcional: validar que tenga mayúscula, minúscula, número y especial
  if (password) {
    if (!/[a-z]/.test(password)) {
      errors.push("La contraseña debe tener al menos una letra minúscula");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("La contraseña debe tener al menos una letra mayúscula");
    }
    if (!/\d/.test(password)) {
      errors.push("La contraseña debe tener al menos un número");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("La contraseña debe tener al menos un carácter especial");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ─── EXPORTAR TODO COMO OBJETO ──────────────────────────────────────────────

export default {
  escapeHTML,
  unescapeHTML,
  escapeAttribute,
  sanitizeUrl,
  isValidEmail,
  sanitizeEmail,
  limitLength,
  sanitizeInput,
  sanitizePhone,
  isValidPhone,
  sanitizeText,
  sanitizeSlug,
  sanitizeBoolean,
  sanitizeNumber,
  sanitizeArray,
  sanitizeObject,
  isRequired,
  isValidMinLength,
  isValidMaxLength,
  validatePassword,
};
