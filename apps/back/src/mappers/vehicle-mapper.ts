import type { VehicleResponse } from "@cardoc/types";
import type { Vehicle } from "../models/vehicle.js";
export const toVehicleResponse = (vehicle: Vehicle): VehicleResponse => ({
  id: vehicle.id,
  customerId: vehicle.customerId,
  licensePlate: vehicle.licensePlate,
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  initialOdometer: vehicle.initialOdometer,
  odometerUnit: vehicle.odometerUnit,
  isActive: vehicle.isActive,
  createdAt: vehicle.createdAt.toISOString(),
  updatedAt: vehicle.updatedAt.toISOString(),
});
