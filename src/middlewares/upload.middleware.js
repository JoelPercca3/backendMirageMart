import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// ─── Tipos MIME permitidos ────────────────────────────────────────────────────
const ALLOWED_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const fileFilter = (_req, file, cb) => {
  ALLOWED_MIMETYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error(
          "Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF y AVIF.",
        ),
        false,
      );
};

// ─── Factory: crea un storage de Cloudinary por contexto ─────────────────────
// ✅ Sin transformation — guarda la imagen ORIGINAL sin tocarla
// Las transformaciones se aplican en el frontend al momento de pedir la imagen
const createStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: "image", // 👈 fuerza a Cloudinary a tratarlo/validarlo como imagen
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    },
  });

// ─── Instancias multer por contexto ──────────────────────────────────────────
const limits = { fileSize: 10 * 1024 * 1024 }; // 10 MB

/** Imágenes de productos — original sin transformar, solo admins */
export const uploadProduct = multer({
  storage: createStorage("miragemart/products"),
  fileFilter,
  limits,
});

/** Banners / hero — original sin transformar, solo admins */
export const uploadBanner = multer({
  storage: createStorage("miragemart/banners"),
  fileFilter,
  limits,
});

/** Imágenes de categorías — original sin transformar, solo admins */
export const uploadCategory = multer({
  storage: createStorage("miragemart/categories"),
  fileFilter,
  limits,
});

/** Imágenes de reseñas — original sin transformar, cualquier usuario autenticado */
export const uploadReview = multer({
  storage: createStorage("miragemart/reviews"),
  fileFilter,
  limits,
});

/** Avatar de perfil — original sin transformar, cualquier usuario autenticado */
export const uploadAvatar = multer({
  storage: createStorage("miragemart/avatars"),
  fileFilter,
  limits,
});

/** Fotos de evidencia para devoluciones — cualquier usuario autenticado, hasta 5 fotos */
export const uploadReturnEvidence = multer({
  storage: createStorage("miragemart/returns"),
  fileFilter,
  limits,
});
