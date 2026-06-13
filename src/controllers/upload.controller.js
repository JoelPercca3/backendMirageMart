import cloudinary from "../config/cloudinary.js";
import { success, error } from "../utils/response.js";

// 🔧 FUNCIÓN PARA LIMPIAR URL
const cleanCloudinaryUrl = (url) => {
  if (!url || !url.includes("cloudinary")) return url;
  // Elimina cualquier transformación entre /upload/ y v123456
  return url.replace(/\/upload\/[^/]*?(v\d+)/, "/upload/$1");
};

export const uploadImage = async (req, res, next) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "miragemart/products",
      transformation: [
        { width: 1600, height: 1600, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    if (!req.file) return error(res, "No se recibió ningún archivo", 400);

    // Limpia la URL antes de enviarla al frontend
    const cleanUrl = cleanCloudinaryUrl(req.file.path);

    success(
      res,
      { url: cleanUrl, filename: req.file.filename },
      "Imagen subida exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

export const uploadImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return error(res, "No se recibieron archivos", 400);

    const files = req.files.map((f) => ({
      url: cleanCloudinaryUrl(f.path), // ← LIMPIA CADA URL
      filename: f.filename,
    }));

    success(res, files, `${files.length} imágenes subidas`);
  } catch (e) {
    next(e);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return error(res, "public_id requerido", 400);
    await cloudinary.uploader.destroy(public_id);
    success(res, null, "Imagen eliminada de Cloudinary");
  } catch (e) {
    next(e);
  }
};
