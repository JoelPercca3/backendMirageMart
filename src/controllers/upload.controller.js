import cloudinary from "../config/cloudinary.js";
import { success, error } from "../utils/response.js";

// ─── Limpia transformaciones incrustadas en la URL de Cloudinary ──────────────
const cleanCloudinaryUrl = (url) => {
  if (!url || !url.includes("cloudinary")) return url;
  return url.replace(/\/upload\/[^/]*?(v\d+)/, "/upload/$1");
};

// ─── Helper: extrae datos de un archivo multer ────────────────────────────────
const fileToResponse = (file) => ({
  url: cleanCloudinaryUrl(file.path),
  filename: file.filename,
});

// ─── Un solo archivo ──────────────────────────────────────────────────────────

/** Sube una imagen de producto (admin) */
export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    success(
      res,
      fileToResponse(req.file),
      "Imagen de producto subida exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

/** Sube múltiples imágenes de producto (admin) */
export const uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return error(res, "No se recibieron archivos", 400);
    success(
      res,
      req.files.map(fileToResponse),
      `${req.files.length} imágenes subidas`,
    );
  } catch (e) {
    next(e);
  }
};

/** Sube una imagen de reseña (usuario autenticado) */
export const uploadReviewImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    success(
      res,
      fileToResponse(req.file),
      "Imagen de reseña subida exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

/** Sube el avatar del usuario (usuario autenticado) */
export const uploadAvatarImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    success(res, fileToResponse(req.file), "Avatar actualizado exitosamente");
  } catch (e) {
    next(e);
  }
};

/** Sube un banner (admin) */
export const uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    success(res, fileToResponse(req.file), "Banner subido exitosamente");
  } catch (e) {
    next(e);
  }
};

/** Sube una imagen de categoría (admin) */
export const uploadCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    success(
      res,
      fileToResponse(req.file),
      "Imagen de categoría subida exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

// ─── Eliminar archivo de Cloudinary ──────────────────────────────────────────

/** Elimina un archivo por public_id (admin) */
export const deleteFile = async (req, res, next) => {
  try {
    const public_id = req.body.public_id || req.query.public_id;
    if (!public_id) return error(res, "public_id requerido", 400);
    await cloudinary.uploader.destroy(public_id);
    success(res, null, "Imagen eliminada de Cloudinary");
  } catch (e) {
    next(e);
  }
};

/** Sube fotos de evidencia para una solicitud de devolución (usuario autenticado) */
export const uploadReturnEvidenceImages = async (req, res, next) => {
  try {
    if (!req.files?.length)
      return error(res, "Debes subir al menos una foto", 400);
    success(
      res,
      req.files.map(fileToResponse),
      `${req.files.length} foto(s) subida(s)`,
    );
  } catch (e) {
    next(e);
  }
};
