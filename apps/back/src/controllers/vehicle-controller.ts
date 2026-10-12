import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import {
  createVehicleSchema,
  updateVehicleSchema,
  archiveVehicleSchema,
  vehicleByIdParamsSchema,
  listVehiclesQuerySchema,
} from "../schemas/vehicle.js";
import * as service from "../services/vehicle-service.js";
export const listVehiclesController: AuthenticatedHandler = async (req, res) => {
  const query = listVehiclesQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid vehicle query." });
    return;
  }
  res.json(await service.listVehicles(res.locals.authorization, query.data));
};
export const vehicleByIdController: AuthenticatedHandler = async (req, res) => {
  const params = vehicleByIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid vehicle ID." });
    return;
  }
  const result = await service.getVehicleById(res.locals.authorization, params.data.vehicleId);
  if (!result) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.json(result);
};
export const createVehicleController: AuthenticatedHandler = async (req, res) => {
  const body = createVehicleSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid vehicle body or undeclared fields." });
    return;
  }
  const result = await service.createVehicle(res.locals.authorization, body.data);
  if (!result) {
    res.status(404).json({ error: "Active customer not found." });
    return;
  }
  res.status(201).json(result);
};
const updateController =
  (archive: boolean): AuthenticatedHandler =>
  async (req, res) => {
    const params = vehicleByIdParamsSchema.safeParse(req.params);
    const body = (archive ? archiveVehicleSchema : updateVehicleSchema).safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid vehicle ID or body." });
      return;
    }
    const result = await service.updateVehicle(
      res.locals.authorization,
      params.data.vehicleId,
      body.data,
    );
    if (!result) {
      res.status(404).json({ error: "Vehicle not found." });
      return;
    }
    res.json(result);
  };
export const updateVehicleController = updateController(false);
export const archiveVehicleController = updateController(true);
export const deleteVehicleController: AuthenticatedHandler = async (req, res) => {
  const params = vehicleByIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid vehicle ID." });
    return;
  }
  if (!(await service.deleteVehicle(res.locals.authorization, params.data.vehicleId))) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.status(204).end();
};
