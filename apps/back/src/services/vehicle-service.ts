import { toVehicleResponse } from "../mappers/vehicle-mapper.js";
import * as repository from "../repositories/vehicle-repository.js";
import { findCustomerById } from "../repositories/customer-repository.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  ListVehiclesQuery,
} from "../schemas/vehicle.js";
const dependencies = { ...repository, findCustomerById };
type Dependencies = typeof dependencies;
const accessibleCustomer = async (
  context: AuthorizationContext,
  id: number,
  deps: Dependencies,
) => {
  const customer = await deps.findCustomerById(context, id);
  return Boolean(
    customer?.isActive && (context.role === "GOD" || customer.mechanicId === context.userId),
  );
};
export const listVehicles = async (
  context: AuthorizationContext,
  query: ListVehiclesQuery,
  deps = dependencies,
) => {
  const { rows, total } = await deps.findVehicles(context, query);
  const totalPages = Math.ceil(total / query.pageSize);
  return {
    data: rows.map(toVehicleResponse),
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
export const getVehicleById = async (
  context: AuthorizationContext,
  id: number,
  deps = dependencies,
) => {
  const row = await deps.findVehicleDetailById(context, id);
  if (!row?.customer.isActive) return null;
  if (context.role !== "GOD" && row.customer.mechanicId !== context.userId) return null;
  return toVehicleResponse(row.vehicle);
};
export const createVehicle = async (
  context: AuthorizationContext,
  input: CreateVehicleInput,
  deps = dependencies,
) => {
  if (!(await accessibleCustomer(context, input.customerId, deps))) return null;
  // Repository rechecks/locks the active parent inside the write transaction.
  const row = await deps.insertVehicle(context, input);
  return row ? toVehicleResponse(row) : null;
};
export const updateVehicle = async (
  context: AuthorizationContext,
  id: number,
  input: UpdateVehicleInput | { isActive: boolean },
  deps = dependencies,
) => {
  if (!(await getVehicleById(context, id, deps))) return null;
  const writable =
    "isActive" in input
      ? input
      : { ...input, year: input.year ?? null, initialOdometer: input.initialOdometer ?? null };
  const row = await deps.updateVehicleById(context, id, writable);
  return row ? toVehicleResponse(row) : null;
};
export const deleteVehicle = async (
  context: AuthorizationContext,
  id: number,
  deps = dependencies,
) => {
  if (!(await getVehicleById(context, id, deps))) return false;
  return Boolean(await deps.deleteVehicleById(context, id));
};
