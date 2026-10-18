import * as repository from "../repositories/work-order-repository.js";
import { findVehicleById } from "../repositories/vehicle-repository.js";
import { findCustomerById } from "../repositories/customer-repository.js";
import { toWorkOrderResponse } from "../mappers/work-order-mapper.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  ListWorkOrdersQuery,
} from "../schemas/work-order.js";
const dependencies = { ...repository, findVehicleById, findCustomerById };
const accessibleParent = async (
  context: AuthorizationContext,
  id: number,
  deps: typeof dependencies,
) => {
  const vehicle = await deps.findVehicleById(context, id);
  if (!vehicle?.isActive) return false;
  const customer = await deps.findCustomerById(context, vehicle.customerId);
  return Boolean(
    customer?.isActive && (context.role === "GOD" || customer.mechanicId === context.userId),
  );
};
export const createWorkOrder = async (
  context: AuthorizationContext,
  input: CreateWorkOrderInput,
  deps = dependencies,
) => {
  if (!(await accessibleParent(context, input.vehicleId, deps))) return null;
  const result = await deps.insertWorkOrder(context, input);
  return result ? toWorkOrderResponse(result) : null;
};
export const getWorkOrderById = async (
  context: AuthorizationContext,
  id: number,
  deps = dependencies,
) => {
  const row = await deps.findWorkOrderById(context, id);
  if (!row?.vehicle.isActive || !row.customer.isActive) return null;
  if (context.role !== "GOD" && row.customer.mechanicId !== context.userId) return null;
  return toWorkOrderResponse(row);
};
export const listWorkOrders = async (
  context: AuthorizationContext,
  vehicleId: number,
  query: ListWorkOrdersQuery,
  deps = dependencies,
) => {
  if (!(await accessibleParent(context, vehicleId, deps))) return null;
  const { rows, total } = await deps.findWorkOrders(context, vehicleId, query);
  const totalPages = Math.ceil(total / query.pageSize);
  return {
    data: rows.map(toWorkOrderResponse),
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
export const updateWorkOrder = async (
  context: AuthorizationContext,
  vehicleId: number,
  id: number,
  input: UpdateWorkOrderInput,
  deps = dependencies,
) => {
  const existing = await getWorkOrderById(context, id, deps);
  if (!existing || existing.vehicleId !== vehicleId) return null;
  const result = await deps.replaceWorkOrderById(context, vehicleId, id, input);
  return result ? toWorkOrderResponse(result) : null;
};
export const deleteWorkOrder = async (
  context: AuthorizationContext,
  id: number,
  deps = dependencies,
) => {
  if (!(await getWorkOrderById(context, id, deps))) return false;
  return Boolean(await deps.deleteWorkOrderById(context, id));
};
