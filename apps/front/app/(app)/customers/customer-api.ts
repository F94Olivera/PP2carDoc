import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
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

export const updateCustomer = (
  customerId: string,
  input: UpdateCustomerRequest,
  fallbackError: string,
) =>
  requestJson<CustomerResponse>(`/customers/${customerId}`, fallbackError, {
    body: JSON.stringify(input),
    method: "PATCH",
  });

export const listAllCustomers = async (fallbackError: string, includeArchived = false) => {
  const customers: CustomerResponse[] = [];
  let page = 1;
  while (true) {
    const response = await listCustomers({ fallbackError, includeArchived, page, pageSize: 100 });
    customers.push(...response.data);
    if (!response.meta.hasNextPage) return customers;
    page++;
  }
};

export const archiveCustomer = (customerId: number, isActive: boolean, fallbackError: string) =>
  requestJson<CustomerResponse>(`/customers/${customerId}`, fallbackError, {
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

const listVehiclesPage = (fallbackError: string, includeArchived: boolean, page: number) => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "100",
  });

  if (includeArchived) {
    query.set("includeArchived", "true");
  }

  return requestJson<PaginatedResponse<VehicleResponse>>(`/vehicles?${query}`, fallbackError);
};

export const listVehicles = async (fallbackError: string, includeArchived = false) => {
  const data: VehicleResponse[] = [];
  let page = 1;
  while (true) {
    const response = await listVehiclesPage(fallbackError, includeArchived, page);
    data.push(...response.data);
    if (!response.meta.hasNextPage) return { ...response, data };
    page++;
  }
};
