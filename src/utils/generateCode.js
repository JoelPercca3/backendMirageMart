import crypto from "crypto";

export const generateOrderCode = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${date}-${random}`;
};

export const generateSlug = (text, suffix = "") => {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return suffix ? `${base}-${suffix}` : base;
};

export const generateToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");
