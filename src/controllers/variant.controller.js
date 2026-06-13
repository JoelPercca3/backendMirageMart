import { pool } from "../config/database.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const getVariantImages = async (req, res, next) => {
  try {
    const { variantId } = req.params;

    const [images] = await pool.query(
      `SELECT id, url, es_principal, orden, alt_text 
       FROM product_images 
       WHERE variant_id = ? 
       ORDER BY es_principal DESC, orden ASC`,
      [variantId],
    );

    res.json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
};

export const addImageToVariant = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ message: "No se proporcionó ninguna imagen" });
    }

    // 1. Verificar que la variante existe
    const [variant] = await pool.query(
      "SELECT product_id, opciones FROM product_variants WHERE id = ?",
      [variantId],
    );

    if (!variant.length) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ message: "Variante no encontrada" });
    }

    const productId = variant[0].product_id;

    // 2. Subir a Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `products/${productId}/variants/${variantId}`,
      transformation: [
        { width: 1600, height: 1600, crop: "limit" }, // más grande
        { quality: "auto:good" }, // calidad automática buena
        { fetch_format: "auto" }, // formato automático
      ],
    });

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    // 3. Contar imágenes existentes para esta variante
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as count FROM product_images WHERE variant_id = ?",
      [variantId],
    );
    const nextOrder = countResult[0].count + 1;
    const isFirst = countResult[0].count === 0;

    // 4. Insertar en BD (asegurar que variant_id NO sea NULL)
    const [insertResult] = await pool.query(
      `INSERT INTO product_images (product_id, variant_id, url, es_principal, orden, alt_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productId,
        variantId, // ← IMPORTANTE: Siempre tiene variant_id
        result.secure_url,
        isFirst ? 1 : 0,
        nextOrder,
        null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Imagen agregada a la variante",
      data: {
        id: insertResult.insertId,
        url: result.secure_url,
        es_principal: isFirst ? 1 : 0,
        orden: nextOrder,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

export const removeImageFromVariant = async (req, res, next) => {
  try {
    const { imageId } = req.params;

    // Verificar que la imagen existe y pertenece a una variante
    const [image] = await pool.query(
      "SELECT * FROM product_images WHERE id = ? AND variant_id IS NOT NULL",
      [imageId],
    );

    if (!image.length) {
      return res.status(404).json({
        message: "Imagen no encontrada o no pertenece a una variante",
      });
    }

    const imageData = image[0];
    const variantId = imageData.variant_id;

    // 1. Eliminar la imagen de BD
    await pool.query("DELETE FROM product_images WHERE id = ?", [imageId]);

    // 2. Reordenar las imágenes restantes de la variante
    const [remainingImages] = await pool.query(
      `SELECT id FROM product_images 
       WHERE variant_id = ? 
       ORDER BY orden`,
      [variantId],
    );

    for (let i = 0; i < remainingImages.length; i++) {
      await pool.query("UPDATE product_images SET orden = ? WHERE id = ?", [
        i + 1,
        remainingImages[i].id,
      ]);
    }

    // 3. Si se eliminó la principal, asignar la nueva primera como principal
    if (imageData.es_principal === 1 && remainingImages.length > 0) {
      await pool.query(
        "UPDATE product_images SET es_principal = 1 WHERE id = ?",
        [remainingImages[0].id],
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error("❌ Error eliminando imagen:", error);
    res.status(500).json({ message: error.message });
  }
};

export const setImageAsPrimary = async (req, res, next) => {
  try {
    const { imageId } = req.params;

    const [image] = await pool.query(
      "SELECT variant_id FROM product_images WHERE id = ? AND variant_id IS NOT NULL",
      [imageId],
    );

    if (!image.length) {
      return res.status(404).json({
        message: "Imagen no encontrada o no pertenece a una variante",
      });
    }

    const variantId = image[0].variant_id;

    // Quitar principal de todas las imágenes de esta variante
    await pool.query(
      "UPDATE product_images SET es_principal = 0 WHERE variant_id = ?",
      [variantId],
    );

    // Establecer nueva principal
    await pool.query(
      "UPDATE product_images SET es_principal = 1 WHERE id = ?",
      [imageId],
    );

    res.json({ success: true, message: "Imagen principal actualizada" });
  } catch (error) {
    next(error);
  }
};
