import cloudinary from "../config/cloudinary.js";
import { success, error } from "../utils/response.js";

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No se recibió ningún archivo", 400);
    // Cloudinary ya subió el archivo — req.file.path es la URL de Cloudinary
    const url = req.file.path;
    success(
      res,
      { url, filename: req.file.filename },
      "Imagen subida exitosamente",
    );
  } catch (e) {
    next(e);
  }
};

export const uploadImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return error(res, "No se recibieron archivos", 400);
    const files = req.files.map((f) => ({ url: f.path, filename: f.filename }));
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
