import { z } from "zod";
import type { NewVehicle } from "../models/vehicle.js";
const id = z.number().int().positive().max(2147483647);
const queryInteger = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export const vehicleByIdParamsSchema = z.strictObject({ vehicleId: queryInteger.pipe(id) });
// Writable fields follow the Drizzle model; IDs, parents and timestamps cannot be edited.
const fields = {
  licensePlate: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .transform((value) => value.toUpperCase()),
  make: z.string().trim().min(1).max(200),
  model: z.string().trim().min(1).max(200),
  year: z.number().int().min(1886).max(2147483647).nullable().optional(),
  initialOdometer: z.number().int().min(0).max(2147483647).nullable().optional(),
  odometerUnit: z.enum(["km", "mi"]),
} satisfies Partial<Record<keyof NewVehicle, z.ZodType>>;
export const createVehicleSchema = z.strictObject({ customerId: id, ...fields });
export const updateVehicleSchema = z.strictObject(fields);
export const archiveVehicleSchema = z.strictObject({ isActive: z.boolean() });
export const listVehiclesQuerySchema = z
  .strictObject({
    page: queryInteger.default(1),
    pageSize: queryInteger.pipe(z.number().max(100)).default(10),
    includeArchived: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(false),
    customerId: queryInteger.pipe(id).optional(),
  })
  .refine((input) => Number.isSafeInteger((input.page - 1) * input.pageSize), "Unsafe offset");
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
