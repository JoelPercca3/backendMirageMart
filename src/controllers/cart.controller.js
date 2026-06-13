import * as cartSvc from "../services/cart.service.js";
import { success } from "../utils/response.js";

export const getCart = async (req, res, next) => {
  try {
    const cart = await cartSvc.getCart(req.user.id);
    success(res, cart);
  } catch (e) {
    next(e);
  }
};
export const addItem = async (req, res, next) => {
  try {
    success(
      res,
      await cartSvc.addItem(req.user.id, req.body),
      "Item agregado al carrito",
    );
  } catch (e) {
    next(e);
  }
};
export const updateQuantity = async (req, res, next) => {
  try {
    success(
      res,
      await cartSvc.updateQuantity(
        req.user.id, // ← userId
        Number(req.params.id), // ← cartItemId
        req.body.cantidad,
      ),
    );
  } catch (e) {
    next(e);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    success(
      res,
      await cartSvc.removeItem(
        req.user.id, // ← userId
        Number(req.params.id), // ← cartItemId
      ),
      "Item eliminado",
    );
  } catch (e) {
    next(e);
  }
};
export const clearCart = async (req, res, next) => {
  try {
    await cartSvc.clearCart(req.user.id);
    success(res, null, "Carrito vaciado");
  } catch (e) {
    next(e);
  }
};
export const applyCoupon = async (req, res, next) => {
  try {
    success(
      res,
      await cartSvc.applyCoupon(req.user.id, req.body.coupon_code),
      "Cupón aplicado",
    );
  } catch (e) {
    next(e);
  }
};
// ... tus funciones existentes ...

// Agregar esta nueva función
export const mergeCart = async (req, res, next) => {
  try {
    console.log("📥 mergeCart controller - body:", req.body);
    const result = await cartSvc.mergeCart(req.user.id, req.body.items);
    success(res, result, "Carrito fusionado");
  } catch (e) {
    console.error("❌ Error en mergeCart:", e);
    next(e);
  }
};
