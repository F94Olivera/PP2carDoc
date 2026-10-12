import type { FinanceResponse } from "@cardoc/types";
import {
  fetchAuthenticated,
  getErrorMessage,
  handleUnauthorizedResponse,
} from "../../lib/auth-client";

export const getFinances = async ({
  endDate,
  fallbackError,
  startDate,
}: {
  endDate: string;
  fallbackError: string;
  startDate: string;
}) => {
  const query = new URLSearchParams({ endDate, startDate });
  const response = await fetchAuthenticated(`/finances?${query}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }

  return (await response.json()) as FinanceResponse;
};
