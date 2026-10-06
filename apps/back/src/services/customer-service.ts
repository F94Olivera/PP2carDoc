import type { CustomerResponse, PaginatedResponse } from "@cardoc/types";
import { toCustomerResponse } from "../mappers/customer-mapper.js";
import { findCustomerById, findCustomers } from "../repositories/customer-repository.js";
import type { ListCustomersQuery } from "../schemas/customer.js";

// The current domain has one shared customer list for authenticated users.
// Introduce explicit workshop membership checks here when the model supports them.
export const listCustomers = async (
  query: ListCustomersQuery,
): Promise<PaginatedResponse<CustomerResponse>> => {
  const { rows, total } = await findCustomers(query);
  const totalPages = Math.ceil(total / query.pageSize);

  return {
    data: rows.map(toCustomerResponse),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getCustomerById = async (customerId: number): Promise<CustomerResponse | null> => {
  const customer = await findCustomerById(customerId);
  return customer ? toCustomerResponse(customer) : null;
};
