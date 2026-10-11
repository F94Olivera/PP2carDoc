import type { CustomerResponse, PaginatedResponse } from "@cardoc/types";
import { toCustomerResponse } from "../mappers/customer-mapper.js";
import {
  deleteCustomerById,
  insertCustomer,
  updateCustomerById,
  findCustomerById,
  findCustomers,
} from "../repositories/customer-repository.js";
import { canChooseMechanic, type AuthorizationContext } from "../schemas/authorization.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
} from "../schemas/customer.js";

export const listCustomers = async (
  context: AuthorizationContext,
  query: ListCustomersQuery,
): Promise<PaginatedResponse<CustomerResponse>> => {
  const { rows, total } = await findCustomers(context, query);
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

export const getCustomerById = async (
  context: AuthorizationContext,
  customerId: number,
  find = findCustomerById,
): Promise<CustomerResponse | null> => {
  const customer = await find(context, customerId);
  return customer ? toCustomerResponse(customer) : null;
};

export const createCustomer = async (
  context: AuthorizationContext,
  input: CreateCustomerInput,
  persist = insertCustomer,
) => {
  if (!canChooseMechanic(context, input.mechanicId)) return { outcome: "forbidden" } as const;
  const customer = await persist(context, {
    ...input,
    mechanicId: input.mechanicId ?? context.userId,
  });
  if (!customer) return { outcome: "forbidden" } as const;
  return { outcome: "success", customer: toCustomerResponse(customer) } as const;
};
export const updateCustomer = async (
  context: AuthorizationContext,
  customerId: number,
  input: UpdateCustomerInput,
  persist = updateCustomerById,
) => {
  const customer = await persist(context, customerId, input);
  return customer
    ? ({ outcome: "success", customer: toCustomerResponse(customer) } as const)
    : ({ outcome: "not_found" } as const);
};
export const deleteCustomer = async (context: AuthorizationContext, customerId: number) =>
  Boolean(await deleteCustomerById(context, customerId));
