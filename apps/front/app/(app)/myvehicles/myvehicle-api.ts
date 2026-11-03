import type { MyVehiclesResponse } from "@cardoc/types";
import { fetchAuthenticated, getErrorMessage } from "../../lib/auth-client";
// fetchAuthenticated -> fetchApi always pins x-region to us-west-2.
export const listMyVehicles = async (fallbackError: string): Promise<MyVehiclesResponse> => {
  const response = await fetchAuthenticated("/myvehicles", { method: "GET" });
  if (!response.ok) throw new Error(await getErrorMessage(response, fallbackError));
  return response.json();
};
