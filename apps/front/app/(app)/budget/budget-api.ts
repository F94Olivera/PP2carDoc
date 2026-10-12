import type { CreateBudgetPdfRequest } from "@cardoc/types";
import { fetchAuthenticated, getErrorMessage } from "../../lib/auth-client";

export const createBudgetPdf = async (payload: CreateBudgetPdfRequest, fallbackError: string) => {
  const response = await fetchAuthenticated("/budgets/pdf", {
    body: JSON.stringify(payload),
    headers: { Accept: "application/pdf", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, fallbackError));
  return response;
};
