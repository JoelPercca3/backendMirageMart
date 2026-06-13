import * as productSvc from "../services/product.service.js";
import { pool } from "../config/database.js";
import { success, created, paginated } from "../utils/response.js";

export const getAll = async (req, res, next) => {
  try {
    paginated(res, await productSvc.getAll(req.query));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const product = await productSvc.getOne(Number(req.params.id));
    console.log("🔍 Producto a enviar:", {
      id: product.id,
      nombre: product.nombre,
      tieneVariantes: !!product.variants,
      totalVariantes: product.variants?.length,
    });
    success(res, product);
  } catch (e) {
    next(e);
  }
};

export const getFeatured = async (req, res, next) => {
  try {
    success(res, await productSvc.getFeatured());
  } catch (e) {
    next(e);
  }
};

export const search = async (req, res, next) => {
  try {
    paginated(res, await productSvc.search(req.query.q, req.query));
  } catch (e) {
    next(e);
  }
};

export const getRelated = async (req, res, next) => {
  try {
    success(res, await productSvc.getRelated(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    paginated(
      res,
      await productSvc.getReviews(Number(req.params.id), req.query),
    );
  } catch (e) {
    next(e);
  }
};

// ✅ CREATE - CORREGIDO
export const create = async (req, res, next) => {
  try {
    const { imagenes, atributos, variantes, ...productData } = req.body;

    const product = await productSvc.create(productData);

    if (product?.id) {
      // ✅ GUARDAR SOLO IMÁGENES BASE (variant_id = null)
      if (imagenes && Array.isArray(imagenes) && imagenes.length > 0) {
        // Normalizar: si es string, convertir a objeto
        const normalizedImages = imagenes.map((img) =>
          typeof img === "string" ? { url: img, variant_id: null } : img,
        );

        // Filtrar solo imágenes base (sin variant_id)
        const baseImages = normalizedImages.filter((img) => !img.variant_id);

        for (let i = 0; i < baseImages.length; i++) {
          const img = baseImages[i];
          await pool.query(
            `INSERT INTO product_images (product_id, variant_id, url, es_principal, orden, alt_text) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              product.id,
              null,
              img.url,
              i === 0 ? 1 : 0,
              i + 1,
              img.alt_text || null,
            ],
          );
        }
      }

      // ✅ GUARDAR ATRIBUTOS
      if (atributos && Array.isArray(atributos) && atributos.length > 0) {
        for (const attr of atributos) {
          if (attr.atributo && attr.valor) {
            await pool.query(
              "INSERT INTO product_attributes (product_id, atributo, valor) VALUES (?, ?, ?)",
              [product.id, attr.atributo, attr.valor],
            );
          }
        }
      }

      // ✅ GUARDAR VARIANTES
      if (variantes && Array.isArray(variantes) && variantes.length > 0) {
        for (const v of variantes) {
          await pool.query(
            `INSERT INTO product_variants 
             (product_id, sku_variante, opciones, precio_extra, stock, imagen_url, activo) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              product.id,
              v.sku_variante || `VAR-${product.id}-${Date.now()}`,
              JSON.stringify(v.opciones),
              v.precio_extra || 0,
              v.stock || 0,
              v.imagen_url || null,
              v.activo !== false ? 1 : 0,
            ],
          );
        }
      }
    }

    const productoCompleto = await productSvc.getOne(product.id);
    created(res, productoCompleto, "Producto creado");
  } catch (err) {
    next(err);
  }
};

// ✅ UPDATE - CORREGIDO
export const update = async (req, res, next) => {
  try {
    const { imagenes, atributos, variantes, ...productData } = req.body;
    const productId = Number(req.params.id);

    // ─────────────────────────────────────────────
    // 1. Actualizar datos del producto
    // ─────────────────────────────────────────────
    await productSvc.update(productId, productData);

    // ─────────────────────────────────────────────
    // 2. ACTUALIZAR SOLO IMÁGENES BASE
    // ─────────────────────────────────────────────
    if (imagenes && Array.isArray(imagenes)) {
      // Normalizar: si es string, mantener como string
      const validImages = imagenes.filter(
        (img) => img && typeof img === "string" && img.trim() !== "",
      );

      // 🔥 SOLO borrar imágenes BASE (variant_id IS NULL)
      await pool.query(
        "DELETE FROM product_images WHERE product_id = ? AND variant_id IS NULL",
        [productId],
      );

      // Insertar nuevas imágenes BASE
      for (let i = 0; i < validImages.length; i++) {
        await pool.query(
          `INSERT INTO product_images (product_id, variant_id, url, es_principal, orden, alt_text)
           VALUES (?, NULL, ?, ?, ?, ?)`,
          [productId, validImages[i], i === 0 ? 1 : 0, i + 1, null],
        );
      }

      // Actualizar JSON legacy
      await pool.query("UPDATE products SET imagenes = ? WHERE id = ?", [
        JSON.stringify(validImages),
        productId,
      ]);
    }

    // ─────────────────────────────────────────────
    // 3. ACTUALIZAR ATRIBUTOS
    // ─────────────────────────────────────────────
    if (atributos && Array.isArray(atributos)) {
      await pool.query("DELETE FROM product_attributes WHERE product_id = ?", [
        productId,
      ]);

      for (const attr of atributos) {
        if (attr.atributo && attr.valor) {
          await pool.query(
            `INSERT INTO product_attributes (product_id, atributo, valor) VALUES (?, ?, ?)`,
            [productId, attr.atributo, attr.valor],
          );
        }
      }
    }

    // ─────────────────────────────────────────────
    // 4. ACTUALIZAR VARIANTES (SOLO datos, NO imágenes)
    // ─────────────────────────────────────────────
    if (variantes && Array.isArray(variantes)) {
      // Obtener IDs de variantes existentes en BD
      const [existingVariants] = await pool.query(
        "SELECT id FROM product_variants WHERE product_id = ?",
        [productId],
      );
      const existingIds = existingVariants.map((v) => v.id);
      const receivedIds = variantes.filter((v) => v.id).map((v) => v.id);

      // IDs a eliminar
      const idsToDelete = existingIds.filter((id) => !receivedIds.includes(id));

      if (idsToDelete.length > 0) {
        await pool.query(
          "DELETE FROM product_variants WHERE id IN (?) AND product_id = ?",
          [idsToDelete, productId],
        );
      }

      // Actualizar o crear variantes
      for (const v of variantes) {
        const opcionesJson = JSON.stringify(v.opciones);
        const skuVariante = v.sku_variante || `VAR-${productId}-${Date.now()}`;

        if (v.id && existingIds.includes(v.id)) {
          // ✅ ACTUALIZAR variante existente
          await pool.query(
            `UPDATE product_variants 
             SET sku_variante = ?, opciones = ?, precio_extra = ?, stock = ?, imagen_url = ?, activo = ?
             WHERE id = ? AND product_id = ?`,
            [
              skuVariante,
              opcionesJson,
              v.precio_extra || 0,
              v.stock || 0,
              v.imagen_url || null,
              v.activo !== false ? 1 : 0,
              v.id,
              productId,
            ],
          );
        } else if (!v.id) {
          // ✅ CREAR nueva variante
          const [existing] = await pool.query(
            "SELECT id FROM product_variants WHERE sku_variante = ? AND product_id = ?",
            [skuVariante, productId],
          );

          if (existing.length === 0) {
            await pool.query(
              `INSERT INTO product_variants 
                (product_id, sku_variante, opciones, precio_extra, stock, imagen_url, activo) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                productId,
                skuVariante,
                opcionesJson,
                v.precio_extra || 0,
                v.stock || 0,
                v.imagen_url || null,
                v.activo !== false ? 1 : 0,
              ],
            );
          }
        }
      }
    }

    // ✅ OBTENER EL PRODUCTO COMPLETO
    const productoCompleto = await productSvc.getOne(productId);

    return success(res, productoCompleto, "Producto actualizado");
  } catch (err) {
    console.error("❌ Error en update:", err);
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await productSvc.remove(Number(req.params.id));
    success(res, null, "Producto eliminado");
  } catch (e) {
    next(e);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    await productSvc.changeStatus(Number(req.params.id), req.body.estado);
    success(res, null, "Estado actualizado");
  } catch (e) {
    next(e);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    await productSvc.updateStock(Number(req.params.id), req.body.stock_total);
    success(res, null, "Stock actualizado");
  } catch (e) {
    next(e);
  }
};
