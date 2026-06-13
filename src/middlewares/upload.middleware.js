import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miragemart/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    transformation: [
      {
        width: 1200, // ← CAMBIADO: 800 → 1200
        height: 1200, // ← CAMBIADO: 800 → 1200
        crop: "limit", // Mantiene proporción
        quality: "auto", // Cloudinary optimiza automáticamente
        fetch_format: "auto", // ← NUEVO: formato óptimo (WebP si el browser lo soporta)
      },
    ],
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error(
          "Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF y AVIF.",
        ),
        false,
      );
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // ← CAMBIADO: 5MB → 10MB (para imágenes más grandes)
});
