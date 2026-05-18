import "dotenv/config";

const required = ["JWT_SECRET", "DB_NAME"];
required.forEach((k) => {
  if (!process.env[k]) {
    console.error(`❌  Variable de entorno requerida faltante: ${k}`);
    process.exit(1);
  }
});

export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || "development";

// Base de datos
export const DB_HOST = process.env.DB_HOST || "localhost";
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_USER = process.env.DB_USER || "root";
export const DB_PASSWORD = process.env.DB_PASSWORD || "";
export const DB_NAME = process.env.DB_NAME;
export const DB_CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT || 10;

// JWT
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// CORS
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
export const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";

// Email
export const MAIL_HOST = process.env.MAIL_HOST;
export const MAIL_PORT = process.env.MAIL_PORT || 587;
export const MAIL_USER = process.env.MAIL_USER;
export const MAIL_PASS = process.env.MAIL_PASS;
export const MAIL_FROM = process.env.MAIL_FROM || "noreply@mishop.com";

// Uploads
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
export const MAX_FILE_SIZE =
  Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Cloudinary ← estas 3 leen del .env correctamente
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
