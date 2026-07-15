import cloudinary from "../config/cloudinary.js";

/**
 * Extrae el public_id de una URL de Cloudinary.
 * Ej: https://res.cloudinary.com/xxx/image/upload/v123/miragemart/products/abc123.jpg
 * → "miragemart/products/abc123"
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match ? match[1] : null;
};

/**
 * Elimina una imagen de Cloudinary a partir de su URL.
 * No lanza error si falla — solo lo registra, para no romper
 * el flujo principal (actualizar/eliminar un producto) por un
 * fallo de limpieza secundario.
 */
export const deleteFromCloudinaryByUrl = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(
      `⚠️ No se pudo eliminar de Cloudinary (${publicId}):`,
      err.message,
    );
  }
};

/**
 * Elimina varias imágenes de Cloudinary en paralelo, a partir de sus URLs.
 */
export const deleteManyFromCloudinary = async (urls = []) => {
  const validUrls = urls.filter(Boolean);
  await Promise.all(validUrls.map((url) => deleteFromCloudinaryByUrl(url)));
};
