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
    success(res, await productSvc.getOne(Number(req.params.id)));
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

// ✅ CREATE actualizado
export const create = async (req, res, next) => {
  try {
    const {
      imagen_url,
      imagenes,
      atributos,
      variantes, // ✅ NUEVO
      ...productData
    } = req.body;

    const product = await productSvc.create(productData);

    if (product?.id) {
      // ✅ GUARDAR IMÁGENES
      if (imagenes && Array.isArray(imagenes) && imagenes.length > 0) {
        for (let i = 0; i < imagenes.length; i++) {
          await pool.query(
            "INSERT INTO product_images (product_id, url, es_principal, orden) VALUES (?, ?, ?, ?)",
            [product.id, imagenes[i], i === 0 ? 1 : 0, i + 1],
          );
        }
      } else if (imagen_url) {
        await pool.query(
          "INSERT INTO product_images (product_id, url, es_principal, orden) VALUES (?, ?, 1, 1)",
          [product.id, imagen_url],
        );
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
              v.sku_variante || "",
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
export const update = async (req, res, next) => {
  try {
    const { imagen_url, imagenes, atributos, ...productData } = req.body;
    console.log("🏷️ Después de desestructurar - atributos:", atributos);
    console.log(
      "🏷️ Después de desestructurar - productData.atributos:",
      productData.atributos,
    );
    const product = await productSvc.update(Number(req.params.id), productData);

    // Actualizar imágenes
    if (imagenes && Array.isArray(imagenes) && imagenes.length > 0) {
      await pool.query("DELETE FROM product_images WHERE product_id = ?", [
        req.params.id,
      ]);
      for (let i = 0; i < imagenes.length; i++) {
        await pool.query(
          "INSERT INTO product_images (product_id, url, es_principal, orden) VALUES (?, ?, ?, ?)",
          [req.params.id, imagenes[i], i === 0 ? 1 : 0, i + 1],
        );
      }
    } else if (imagen_url) {
      const [[existing]] = await pool.query(
        "SELECT id FROM product_images WHERE product_id = ? AND es_principal = 1 LIMIT 1",
        [req.params.id],
      );
      if (existing) {
        await pool.query("UPDATE product_images SET url = ? WHERE id = ?", [
          imagen_url,
          existing.id,
        ]);
      } else {
        await pool.query(
          "INSERT INTO product_images (product_id, url, es_principal, orden) VALUES (?, ?, 1, 1)",
          [req.params.id, imagen_url],
        );
      }
    }

    // ✅ Actualizar atributos (borrar y re-insertar)
    if (atributos && Array.isArray(atributos)) {
      await pool.query("DELETE FROM product_attributes WHERE product_id = ?", [
        req.params.id,
      ]);
      for (const attr of atributos) {
        if (attr.atributo && attr.valor) {
          await pool.query(
            "INSERT INTO product_attributes (product_id, atributo, valor) VALUES (?, ?, ?)",
            [req.params.id, attr.atributo, attr.valor],
          );
        }
      }
    }

    success(res, product, "Producto actualizado");
  } catch (err) {
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
