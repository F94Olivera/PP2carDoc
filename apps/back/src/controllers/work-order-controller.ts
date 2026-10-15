import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import * as schema from "../schemas/work-order.js";
import * as service from "../services/work-order-service.js";
export const createWorkOrderController: AuthenticatedHandler = async (req, res) => {
  const body = schema.createWorkOrderSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid work order body." });
    return;
  }
  const result = await service.createWorkOrder(res.locals.authorization, body.data);
  if (!result) {
    res.status(404).json({ error: "Active vehicle not found." });
    return;
  }
  res.status(201).json(result);
};
export const workOrderByIdController: AuthenticatedHandler = async (req, res) => {
  const params = schema.workOrderParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid work order ID." });
    return;
  }
  const result = await service.getWorkOrderById(res.locals.authorization, params.data.workOrderId);
  if (!result) {
    res.status(404).json({ error: "Work order not found." });
    return;
  }
  res.json(result);
};
export const workOrdersByVehicleController: AuthenticatedHandler = async (req, res) => {
  const params = schema.vehicleOrderParamsSchema.safeParse(req.params);
  const query = schema.listWorkOrdersQuerySchema.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid vehicle ID or query." });
    return;
  }
  const result = await service.listWorkOrders(
    res.locals.authorization,
    params.data.vehicleId,
    query.data,
  );
  if (!result) {
    res.status(404).json({ error: "Active vehicle not found." });
    return;
  }
  res.json(result);
};
export const replaceWorkOrderController: AuthenticatedHandler = async (req, res) => {
  const params = schema.replaceWorkOrderParamsSchema.safeParse(req.params);
  const body = schema.updateWorkOrderSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid work order ID or body." });
    return;
  }
  const result = await service.updateWorkOrder(
    res.locals.authorization,
    params.data.vehicleId,
    params.data.workOrderId,
    body.data,
  );
  if (!result) {
    res.status(404).json({ error: "Work order not found." });
    return;
  }
  res.json(result);
};
export const deleteWorkOrderController: AuthenticatedHandler = async (req, res) => {
  const params = schema.workOrderParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid work order ID." });
    return;
  }
  if (!(await service.deleteWorkOrder(res.locals.authorization, params.data.workOrderId))) {
    res.status(404).json({ error: "Work order not found." });
    return;
  }
  res.status(204).end();
};
