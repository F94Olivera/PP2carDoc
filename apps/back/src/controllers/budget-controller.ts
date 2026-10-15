import { Buffer } from "node:buffer";
import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import { budgetPdfSchema } from "../schemas/budget.js";
import { createBudgetPdf } from "../services/budget-service.js";

export const createBudgetPdfController: AuthenticatedHandler = async (req, res) => {
  const input = budgetPdfSchema.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({
      error: "Datos de presupuesto inválidos. Revisá campos, fecha, cantidades y precios.",
    });
    return;
  }
  const pdf = await createBudgetPdf();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="presupuesto-${input.data.date}.pdf"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(pdf));
};
