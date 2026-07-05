import * as libroSvc from "../services/libroReclamaciones.service.js";
import { success, created } from "../utils/response.js";

export const libroCreate = async (req, res, next) => {
  try {
    const result = await libroSvc.create(req.body);
    created(
      res,
      result,
      "Registrado. Revisa tu correo para ver la constancia.",
    );
  } catch (e) {
    next(e);
  }
};

// Descarga pública protegida por código + email (ambos los tiene el
// consumidor porque se los mostramos/enviamos al momento de registrar).
export const libroDescargarConstancia = async (req, res, next) => {
  try {
    const { codigo, email } = req.query;
    const { buffer, filename } = await libroSvc.getConstancia(codigo, email);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};
