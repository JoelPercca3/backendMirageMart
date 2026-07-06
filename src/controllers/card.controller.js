import culqi from "../config/culqi.js";
import * as cardRepo from "../repositories/card.repository.js";
import { success, created } from "../utils/response.js";
import { AppError } from "../middlewares/errorHandler.middleware.js";

// Crea (o reutiliza) el customer de Culqi asociado al usuario
async function ensureCulqiCustomer(userId) {
  let customerId = await cardRepo.getCulqiCustomerId(userId);
  if (customerId) return customerId;

  const userInfo = await cardRepo.getUserBasicInfo(userId);
  if (!userInfo) throw new AppError("Usuario no encontrado", 404);

  const [first_name, ...rest] = (userInfo.nombre || "Cliente").split(" ");
  const last_name = rest.join(" ") || "MirageMart";

  const { data } = await culqi.post("/customers", {
    first_name,
    last_name,
    email: userInfo.email,
    address: "No especificada",
    address_city: "No especificada",
    country_code: "PE",
    phone_number: userInfo.telefono || "999999999",
  });

  customerId = data.id;
  await cardRepo.saveCulqiCustomerId(userId, customerId);
  return customerId;
}

// ⚠️ Extrae marca/últimos 4 de la respuesta de Culqi. Los nombres de campo
// son los documentados públicamente por Culqi, pero no probados en vivo
// contra tu cuenta — revisa el console.log de abajo si algo sale undefined.
function parseCardInfo(culqiCard) {
  const source = culqiCard.source || {};
  const iin = source.iin || {};
  return {
    marca: iin.card_brand || source.card_brand || "Tarjeta",
    ultimos4:
      source.last_four || (source.card_number || "").slice(-4) || "0000",
    tipo_detectado: (iin.card_type || "").toLowerCase().includes("credit")
      ? "credito"
      : "debito",
  };
}

export const listCards = async (req, res, next) => {
  try {
    const cards = await cardRepo.getByUser(req.user.id);
    success(res, cards);
  } catch (err) {
    next(err);
  }
};

export const addCard = async (req, res, next) => {
  try {
    const { token_id, tipo } = req.body;
    if (!token_id) throw new AppError("Falta el token de la tarjeta", 400);

    const customerId = await ensureCulqiCustomer(req.user.id);

    const { data: culqiCard } = await culqi.post("/cards", {
      customer_id: customerId,
      token_id,
    });

    console.log(
      "📥 Respuesta de Culqi al crear tarjeta:",
      JSON.stringify(culqiCard, null, 2),
    );

    const { marca, ultimos4, tipo_detectado } = parseCardInfo(culqiCard);
    const existentes = await cardRepo.countByUser(req.user.id);

    const id = await cardRepo.create({
      user_id: req.user.id,
      culqi_card_id: culqiCard.id,
      tipo: tipo || tipo_detectado || "debito",
      marca,
      ultimos4,
      es_principal: existentes === 0, // la primera tarjeta queda como principal
    });

    created(res, { id, marca, ultimos4 }, "Tarjeta agregada correctamente");
  } catch (err) {
    if (err.response?.data) {
      console.error(
        "❌ Error Culqi:",
        JSON.stringify(err.response.data, null, 2),
      );
      return next(
        new AppError(
          err.response.data.user_message ||
            err.response.data.merchant_message ||
            "No se pudo guardar la tarjeta",
          400,
        ),
      );
    }
    next(err);
  }
};

export const deleteCard = async (req, res, next) => {
  try {
    const card = await cardRepo.findById(req.params.id, req.user.id);
    if (!card) throw new AppError("Tarjeta no encontrada", 404);

    try {
      await culqi.delete(`/cards/${card.culqi_card_id}`);
    } catch (err) {
      // Si ya no existe en Culqi, igual la limpiamos de nuestra BD
      console.warn(
        "⚠️ No se pudo eliminar en Culqi (puede que ya no exista):",
        err.response?.data || err.message,
      );
    }

    await cardRepo.remove(card.id, req.user.id);
    success(res, null, "Tarjeta eliminada");
  } catch (err) {
    next(err);
  }
};

export const setDefaultCard = async (req, res, next) => {
  try {
    const ok = await cardRepo.setDefault(req.params.id, req.user.id);
    if (!ok) throw new AppError("Tarjeta no encontrada", 404);
    success(res, null, "Tarjeta marcada como principal");
  } catch (err) {
    next(err);
  }
};
