import { Router } from "express";
import {
  listCards,
  addCard,
  deleteCard,
  setDefaultCard,
} from "../controllers/card.controller.js";
import { authJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authJWT, listCards);
router.post("/", authJWT, addCard);
router.delete("/:id", authJWT, deleteCard);
router.patch("/:id/default", authJWT, setDefaultCard);

export default router;
