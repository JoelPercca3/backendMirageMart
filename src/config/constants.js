export const ROLES = {
  ADMIN: "admin",
  CLIENT: "cliente",
  SELLER: "vendedor",
};

export const ORDER_STATUS = {
  PENDING: "pendiente",
  PAID: "pagado",
  PREPARING: "preparando",
  SHIPPED: "enviado",
  DELIVERED: "entregado",
  CANCELLED: "cancelado",
  REFUNDED: "reembolsado",
};

export const PAYMENT_STATUS = {
  PENDING: "pendiente",
  COMPLETED: "completado",
  FAILED: "fallido",
  REFUNDED: "reembolsado",
};

export const PRODUCT_STATUS = {
  ACTIVE: "activo",
  INACTIVE: "inactivo",
  OUT_OF_STOCK: "agotado",
  DRAFT: "borrador",
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const BCRYPT_ROUNDS = 12;

export const EMAIL_VERIFICATION = {
  CODE_LENGTH: 6,
  EXPIRATION_MINUTES: 10,
  MAX_VERIFY_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  MAX_RESENDS_PER_HOUR: 5,
  RESEND_COOLDOWN_SECONDS: 60, // espera entre reenvíos
};
