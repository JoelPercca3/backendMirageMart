import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./product.routes.js";
import categoryRoutes from "./category.routes.js";
import orderRoutes from "./order.routes.js";
import cartRoutes from "./cart.routes.js";
import userRoutes from "./user.routes.js";
import paymentRoutes from "./payment.routes.js";
import reviewRoutes from "./review.routes.js";
import wishlistRoutes from "./wishlist.routes.js";
import uploadRoutes from "./upload.routes.js";
import adminRoutes from "./admin.routes.js";
import { pool } from "../config/database.js";
import variantRoutes from "./variant.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/cart", cartRoutes);
router.use("/users", userRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/uploads", uploadRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/variants", variantRoutes);

// ← Ruta pública para métodos de envío
router.get("/shipping", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM shipping_methods WHERE activo = 1 ORDER BY precio ASC",
  );
  res.json({ ok: true, data: rows });
});

export default router;
