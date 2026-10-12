import { budgetPdfSchema, type CreateBudgetPdfRequest } from "@cardoc/types";
import { fetchAuthenticated, getErrorMessage } from "../../lib/auth-client";

export const createBudgetPdf = async (payload: CreateBudgetPdfRequest, fallbackError: string) => {
  const parsed = budgetPdfSchema.safeParse(payload);
  if (!parsed.success)
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? fallbackError}`);
  const response = await fetchAuthenticated("/budgets/pdf", {
    body: JSON.stringify(parsed.data),
    headers: { Accept: "application/pdf", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, fallbackError));
  if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("application/pdf"))
    throw new Error(fallbackError);
  return response;
};

export const downloadBudgetPdf = async (response: Response, budgetDate: string) => {
  const pdf = await response.blob();
  const url = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download =
      response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/i)?.[1] ??
      `presupuesto-${budgetDate}.pdf`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Give the browser time to start consuming the download before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
