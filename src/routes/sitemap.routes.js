import { Router } from "express";
import { pool } from "../config/database.js";
import { CLIENT_URL } from "../config/env.js";

const router = Router();

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const [products] = await pool.query(
      "SELECT id, updated_at FROM products WHERE estado = 'activo'",
    );
    const [categories] = await pool.query("SELECT id FROM categories");

    const baseUrl = CLIENT_URL || "http://localhost:3000";

    const staticUrls = [
      `<url><loc>${baseUrl}/</loc><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/products</loc><priority>0.9</priority></url>`,
    ];

    const categoryUrls = categories.map(
      (c) =>
        `<url><loc>${baseUrl}/products?category_id=${c.id}</loc><priority>0.7</priority></url>`,
    );

    const productUrls = products.map((p) => {
      const lastmod = p.updated_at
        ? new Date(p.updated_at).toISOString()
        : new Date().toISOString();
      return `<url><loc>${baseUrl}/products/${p.id}</loc><lastmod>${lastmod}</lastmod><priority>0.8</priority></url>`;
    });

    const urls = [...staticUrls, ...categoryUrls, ...productUrls].join("\n");

    res.header("Content-Type", "application/xml");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
  } catch (err) {
    next(err);
  }
});
router.get("/robots.txt", (req, res) => {
  const baseUrl = CLIENT_URL || "http://localhost:3000";
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`);
});

export default router;
