import type {
  CreateCustomerRequest,
  CustomerResponse,
  PaginatedResponse,
  VehicleResponse,
} from "@cardoc/types";
import {
  fetchAuthenticated,
  getErrorMessage,
  handleUnauthorizedResponse,
} from "../../lib/auth-client";

export const getCustomerName = (customer: Pick<CustomerResponse, "firstName" | "lastName">) =>
  [customer.firstName, customer.lastName].filter(Boolean).join(" ");

const requestJson = async <T>(path: string, fallbackError: string, init?: RequestInit) => {
  const response = await fetchAuthenticated(path, {
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
};

type ListCustomersOptions = {
  fallbackError: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};

export const listCustomers = (options: ListCustomersOptions | string) => {
  const {
    fallbackError,
    includeArchived = false,
    page = 1,
    pageSize = 100,
  } = typeof options === "string" ? { fallbackError: options } : options;
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (includeArchived) {
    query.set("includeArchived", "true");
  }

  return requestJson<PaginatedResponse<CustomerResponse>>(`/customers?${query}`, fallbackError);
};

export const createCustomer = (customer: CreateCustomerRequest, fallbackError: string) =>
  requestJson<CustomerResponse>("/customers", fallbackError, {
    body: JSON.stringify(customer),
    method: "POST",
  });

export const getCustomer = (customerId: string, fallbackError: string) =>
  requestJson<CustomerResponse>(`/customers/${customerId}`, fallbackError);

export const archiveCustomer = (customerId: number, isActive: boolean, fallbackError: string) =>
  requestJson<CustomerResponse>(`/customers/${customerId}/archive`, fallbackError, {
    body: JSON.stringify({ isActive }),
    method: "PATCH",
  });

export const deleteCustomer = async (customerId: number, fallbackError: string) => {
  const response = await fetchAuthenticated(`/customers/${customerId}`, {
    headers: {
      Accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }
};

export const listVehicles = (fallbackError: string, includeArchived = false) => {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "100",
  });

  if (includeArchived) {
    query.set("includeArchived", "true");
  }

  return requestJson<PaginatedResponse<VehicleResponse>>(`/vehicles?${query}`, fallbackError);
};
