import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import cardRoutes from "./routes/card.routes.js";
import sitemapRoutes from "./routes/sitemap.routes.js";
import { CLIENT_URL, ADMIN_URL, NODE_ENV } from "./config/env.js";
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import routes from "./routes/index.js";
import contactRoutes from "./routes/contact.routes.js";
import libroReclamacionesRoutes from "./routes/libroReclamaciones.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import refundRequestRoutes from "./routes/refundRequest.routes.js";
import returnRequestRoutes from "./routes/returnRequest.routes.js";

// __dirname equivalente en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1); // ← agrega esta línea aquí

// ── Seguridad ─────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // permite servir imágenes
  }),
);

// ── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      CLIENT_URL,
      ADMIN_URL,
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"],
  }),
);

// ── Logging ───────────────────────────────────────────────
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ── Parsers y compresión ──────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiting general ─────────────────────────────────
app.use(generalLimiter);

// ── Archivos estáticos (uploads) ──────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ── Healthcheck ───────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "ecommerce-backend",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  }),
);

// ── API Routes ────────────────────────────────────────────
app.use("/api/v1", routes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/libro-reclamaciones", libroReclamacionesRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/cards", cardRoutes);
app.use("/", sitemapRoutes);
app.use("/api/v1/refund-requests", refundRequestRoutes);
app.use("/api/v1/return-requests", returnRequestRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  }),
);

// ── Error handler global (siempre el último) ──────────────
app.use(errorHandler);

export default app;
