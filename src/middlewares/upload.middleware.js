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
const createStorage = (folder, width, height) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
      transformation: [
        {
          width,
          height,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    },
  });

// ─── Instancias multer por contexto ──────────────────────────────────────────
const limits = { fileSize: 10 * 1024 * 1024 }; // 10 MB

/** Imágenes de productos  — 1200×1200, solo admins */
export const uploadProduct = multer({
  storage: createStorage("miragemart/products", 1200, 1200),
  fileFilter,
  limits,
});

/** Banners / hero  — 1920×600, solo admins */
export const uploadBanner = multer({
  storage: createStorage("miragemart/banners", 1920, 600),
  fileFilter,
  limits,
});

/** Imágenes de categorías — 800×800, solo admins */
export const uploadCategory = multer({
  storage: createStorage("miragemart/categories", 800, 800),
  fileFilter,
  limits,
});

/** Imágenes de reseñas — 800×800, cualquier usuario autenticado */
export const uploadReview = multer({
  storage: createStorage("miragemart/reviews", 800, 800),
  fileFilter,
  limits,
});

/** Avatar de perfil — 400×400, cualquier usuario autenticado */
export const uploadAvatar = multer({
  storage: createStorage("miragemart/avatars", 400, 400),
  fileFilter,
  limits,
});
