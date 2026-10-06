import type { CustomerResponse } from "@cardoc/types";
import type { Customer } from "../models/customer.js";

export const toCustomerResponse = (customer: Customer): CustomerResponse => ({
  id: customer.id,
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  phone: customer.phone,
  address: customer.address,
  documentNumber: customer.documentNumber,
  notes: customer.notes,
  isActive: customer.isActive,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
});
