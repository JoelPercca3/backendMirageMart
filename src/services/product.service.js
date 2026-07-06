import * as productRepo from "../repositories/product.repository.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";
import { getPagination } from "../utils/paginate.js";
import { generateSlug } from "../utils/generateCode.js";
import { pool } from "../config/database.js";

// ─── Diccionario de sinónimos ─────────────────────────────────────────────────
const SINONIMOS = {
  // Electrónica / Audio
  audifono: [
    "audifonos",
    "auriculares",
    "auricular",
    "headphones",
    "cascos",
    "earphones",
    "earbuds",
  ],
  audifonos: ["auriculares", "headphones", "cascos", "earphones", "earbuds"],
  auriculares: [
    "audifono",
    "audifonos",
    "headphones",
    "cascos",
    "earphones",
    "earbuds",
  ],
  headphones: ["audifonos", "auriculares", "cascos"],
  earbuds: ["audifonos", "auriculares", "earphones"],
  cascos: ["audifonos", "audifono", "auriculares", "headphones"],

  // Ropa
  casaca: ["chaqueta", "jacket", "abrigo", "campera"],
  chaqueta: ["casaca", "jacket", "abrigo", "campera"],
  campera: ["casaca", "chaqueta", "jacket"],
  abrigo: ["casaca", "chaqueta", "campera"],
  polera: ["camiseta", "polo", "playera", "remera"],
  camiseta: ["polera", "polo", "playera", "remera", "t-shirt"],
  polo: ["polera", "camiseta", "playera", "remera"],
  playera: ["polera", "camiseta", "polo", "remera"],
  remera: ["polera", "camiseta", "polo", "playera"],
  pantalon: ["jean", "jeans", "pant", "leggins", "leggings"],
  jean: ["pantalon", "jeans"],
  jeans: ["pantalon", "jean"],
  zapatillas: ["tenis", "sneakers", "deportivos", "zapatos"],
  tenis: ["zapatillas", "sneakers", "deportivos"],
  sneakers: ["zapatillas", "tenis", "deportivos"],
  zapatos: ["zapatillas", "calzado", "tenis"],
  calzado: ["zapatos", "zapatillas", "tenis"],

  // Tecnología
  celular: ["smartphone", "movil", "telefono", "iphone", "android"],
  smartphone: ["celular", "movil", "telefono"],
  movil: ["celular", "smartphone", "telefono"],
  telefono: ["celular", "smartphone", "movil"],
  laptop: ["notebook", "computadora", "portatil", "pc"],
  notebook: ["laptop", "computadora", "portatil"],
  computadora: ["laptop", "notebook", "pc", "computador"],
  portatil: ["laptop", "notebook"],
  teclado: ["keyboard"],
  keyboard: ["teclado"],
  mouse: ["raton", "cursor"],
  raton: ["mouse"],
  parlante: ["altavoz", "bocina", "speaker"],
  altavoz: ["parlante", "bocina", "speaker"],
  bocina: ["parlante", "altavoz", "speaker"],
  speaker: ["parlante", "altavoz", "bocina"],
  televisor: ["tv", "television", "pantalla"],
  television: ["televisor", "tv", "pantalla"],
  tv: ["televisor", "television"],
  camara: ["camera", "fotografica"],
  camera: ["camara", "fotografica"],

  // Hogar
  refrigeradora: ["refrigerador", "nevera", "heladera"],
  refrigerador: ["refrigeradora", "nevera", "heladera"],
  nevera: ["refrigeradora", "refrigerador", "heladera"],
  lavadora: ["lavarropas", "washing machine"],
  sofa: ["sillon", "mueble", "couch"],
  sillon: ["sofa", "mueble"],

  // Deportes
  bicicleta: ["bici", "bike", "ciclismo"],
  bici: ["bicicleta", "bike"],
  mochila: ["bolso", "backpack", "morral"],
  bolso: ["mochila", "cartera", "bag"],
  backpack: ["mochila", "bolso"],
  cartera: ["bolso", "bolsa", "wallet"],
};

// ─── Orden natural de tallas ──────────────────────────────────────────────────
const TALLA_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
];

const sortTallas = (tallas) => {
  return [...tallas].sort((a, b) => {
    const ia = TALLA_ORDER.indexOf(a);
    const ib = TALLA_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
};

// ─── Helper: expandir términos de búsqueda con sinónimos ──────────────────
function expandirTerminos(q) {
  if (!q || q.trim().length < 2) return [q?.trim() || ""];
  const termino = q.toLowerCase().trim();
  const sinonimos = SINONIMOS[termino] ?? [];
  const extra = [];
  for (const [key, synonyms] of Object.entries(SINONIMOS)) {
    if (synonyms.includes(termino)) {
      extra.push(key);
      extra.push(...synonyms);
    }
  }
  return [...new Set([termino, ...sinonimos, ...extra])];
}

// ─── Helper: expandir category_id a [padre, ...hijas] ──────────────────────
async function expandCategoryIds(category_id) {
  if (!category_id) return null;
  const [children] = await pool.query(
    "SELECT id FROM categories WHERE parent_id = ?",
    [category_id],
  );
  return [Number(category_id), ...children.map((c) => c.id)];
}

// ─── Service: Obtener todos los productos ────────────────────────────────────
export const getAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const {
    category_id,
    brand_id,
    min_price,
    max_price,
    talla,
    color,
    estado,
    search,
    sort,
  } = query;

  const estadoFilter = estado || "activo";

  let expandedSearch = search;
  if (search && search.trim().length >= 2) {
    const terminos = expandirTerminos(search.trim());
    expandedSearch = terminos.join(",");
  }

  let expandedCategoryIds = null;
  if (category_id) {
    expandedCategoryIds = await expandCategoryIds(category_id);
  }

  const { rows, total } = await productRepo.getAll({
    limit,
    offset,
    category_id: expandedCategoryIds,
    brand_id,
    min_price,
    max_price,
    talla,
    color,
    estado: estadoFilter,
    search: expandedSearch,
    sort,
  });

  return { data: rows, total, page, limit };
};

// ─── Service: Obtener un producto por ID ────────────────────────────────────
export const getOne = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);
  return product;
};

// ─── Service: Obtener productos destacados ──────────────────────────────────
export const getFeatured = async () => {
  return productRepo.getFeatured(12);
};

// ─── Service: Opciones disponibles para los filtros ────────────────────────
export const getFilterOptions = async () => {
  const options = await productRepo.getFilterOptions();
  return {
    ...options,
    tallas: sortTallas(options.tallas),
  };
};

// ─── Service: Búsqueda pública con sinónimos ────────────────────────────────
export const search = async (q, query) => {
  if (!q || q.trim().length < 2) {
    throw new AppError(
      "El término de búsqueda debe tener al menos 2 caracteres",
      400,
    );
  }

  const { page, limit, offset } = getPagination(query);
  const {
    category_id,
    brand_id,
    min_price,
    max_price,
    talla,
    color,
    sort,
    estado,
  } = query;
  const terminos = expandirTerminos(q.trim());

  // ─── CONSTRUIR WHERE ──────────────────────────────────────────────────────
  const conditions = terminos
    .map(() => "(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ?)")
    .join(" OR ");
  const params = terminos.flatMap((t) => [`%${t}%`, `%${t}%`, `%${t}%`]);

  let where = `WHERE (${conditions})`;

  // ─── FILTROS ──────────────────────────────────────────────────────────────
  if (estado && estado !== "") {
    where += " AND p.estado = ?";
    params.push(estado);
  }

  if (category_id) {
    const categoryIds = await expandCategoryIds(category_id);
    const placeholders = categoryIds.map(() => "?").join(", ");
    where += ` AND p.category_id IN (${placeholders})`;
    params.push(...categoryIds);
  }

  if (brand_id) {
    where += " AND p.brand_id = ?";
    params.push(brand_id);
  }
  if (min_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) >= ?";
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    where += " AND COALESCE(p.precio_oferta, p.precio_base) <= ?";
    params.push(parseFloat(max_price));
  }
  if (talla) {
    const tallas = talla.split(",").filter(Boolean);
    if (tallas.length > 0) {
      const placeholders = tallas.map(() => "?").join(", ");
      where += ` AND EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id AND pv.activo = 1
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Talla')) IN (${placeholders})
    )`;
      params.push(...tallas);
    }
  }

  if (color) {
    const colores = color.split(",").filter(Boolean);
    if (colores.length > 0) {
      const placeholders = colores.map(() => "?").join(", ");
      where += ` AND EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id AND pv.activo = 1
      AND JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) IN (${placeholders})
    )`;
      params.push(...colores);
    }
  }

  // ─── ORDER BY ────────────────────────────────────────────────────────────
  let orderBy = "p.ventas_count DESC, p.rating_promedio DESC";
  if (sort) {
    const parts = sort.split(":");
    const field = parts[0];
    const direction = parts.length > 1 ? parts[1] : "asc";
    const allowedFields = [
      "precio_base",
      "precio_oferta",
      "created_at",
      "ventas_count",
      "rating_promedio",
    ];
    if (
      allowedFields.includes(field) &&
      ["asc", "desc"].includes(direction.toLowerCase())
    ) {
      if (field === "ventas_count") {
        orderBy = `ventas_count ${direction}`;
      } else if (field === "precio_base" || field === "precio_oferta") {
        orderBy = `COALESCE(p.precio_oferta, p.precio_base) ${direction}`;
      } else {
        orderBy = `p.${field} ${direction}`;
      }
    }
  }

  // ─── COUNT ────────────────────────────────────────────────────────────────
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM products p ${where}`,
    params,
  );

  // ─── QUERY PRINCIPAL ──────────────────────────────────────────────────────
  const [rows] = await pool.query(
    `SELECT p.*,
            c.nombre as categoria,
            b.nombre as marca,
            (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as ventas_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // ─── IMÁGENES ─────────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const productIds = rows.map((r) => r.id);
    const [allImages] = await pool.query(
      `SELECT pi.product_id, pi.id, pi.url, pi.variant_id, pi.es_principal, pi.orden, pi.alt_text,
          JSON_UNQUOTE(JSON_EXTRACT(pv.opciones, '$.Color')) as variant_color
   FROM product_images pi
   LEFT JOIN product_variants pv ON pi.variant_id = pv.id
   WHERE pi.product_id IN (?)
   ORDER BY pi.product_id, pi.variant_id IS NULL DESC, pi.variant_id, pi.orden`,
      [productIds],
    );
    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push(img);
    });
    rows.forEach((row) => {
      row.images = imagesMap[row.id] || [];
    });
  }

  return { data: rows, total, page, limit };
};

// ─── Service: Obtener productos relacionados ────────────────────────────────
export const getRelated = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);
  return productRepo.getRelated(id, product.category_id);
};

// ─── Service: Crear producto ──────────────────────────────────────────────────
export const create = async (data) => {
  let slug = generateSlug(data.nombre);
  const existing = await productRepo.findBySlug(slug);
  if (existing) {
    slug = generateSlug(data.nombre, Date.now().toString().slice(-5));
  }
  const id = await productRepo.create({ ...data, slug });
  return productRepo.findById(id);
};

// ─── Service: Actualizar producto ─────────────────────────────────────────────
export const update = async (id, data) => {
  const product = await productRepo.findById(id);
  if (!product) throw new AppError("Producto no encontrado", 404);

  if (data.nombre && data.nombre !== product.nombre) {
    let slug = generateSlug(data.nombre);
    const existing = await productRepo.findBySlug(slug);
    if (existing && existing.id !== id) {
      slug = generateSlug(data.nombre, String(id));
    }
    data.slug = slug;
  }

  await productRepo.update(id, data);
  return productRepo.findById(id);
};

// ─── Service: Eliminar producto ──────────────────────────────────────────────
export const remove = async (id) => {
  const ok = await productRepo.remove(id);
  if (!ok) throw new AppError("Producto no encontrado", 404);
};

// ─── Service: Cambiar estado del producto ──────────────────────────────────
export const changeStatus = async (id, estado) => {
  const valid = ["activo", "inactivo", "agotado", "borrador"];
  if (!valid.includes(estado)) throw new AppError("Estado inválido", 400);

  const ok = await productRepo.update(id, { estado });
  if (!ok) throw new AppError("Producto no encontrado", 404);
};

// ─── Service: Actualizar stock ──────────────────────────────────────────────
export const updateStock = async (id, stock_total) => {
  if (stock_total < 0)
    throw new AppError("El stock no puede ser negativo", 400);

  await productRepo.update(id, {
    stock_total,
    estado: stock_total === 0 ? "agotado" : "activo",
  });
};

// ─── Service: Obtener reseñas de un producto ────────────────────────────────
export const getReviews = async (productId, query) => {
  const { page, limit, offset } = getPagination(query);

  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND aprobado = 1",
    [productId],
  );

  const [rows] = await pool.query(
    `SELECT r.id, r.calificacion, r.titulo, r.comentario, r.imagenes,
            r.util_count, r.created_at, u.nombre as autor, u.avatar_url
     FROM reviews r JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? AND r.aprobado = 1
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [productId, limit, offset],
  );

  return { data: rows, total, page, limit };
};
