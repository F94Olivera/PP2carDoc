import { z } from "zod";
import type { NewWorkOrder } from "../models/work-order.js";
const id = z.number().int().positive().max(2147483647);
const routeId = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(id);
export const workOrderParamsSchema = z.strictObject({ workOrderId: routeId });
export const vehicleOrderParamsSchema = z.strictObject({ vehicleId: routeId });
export const replaceWorkOrderParamsSchema = z.strictObject({
  vehicleId: routeId,
  workOrderId: routeId,
});
const text = z.string().trim().min(1);
const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const fields = {
  entryDate: date,
  reportedProblem: text,
  intakeOdometer: z.number().int().min(0).max(2147483647).nullable().optional(),
  notes: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
} satisfies Partial<Record<keyof NewWorkOrder, z.ZodType>>;
const children = {
  items: z.array(
    z.strictObject({
      description: text,
      category: z.enum(["labor", "part", "other"]).default("other"),
      quantity: z
        .number()
        .positive()
        .max(3.4028234663852886e38)
        .refine((value) => Math.fround(value) > 0),
      unitPrice: z.number().int().min(0).max(2147483647),
    }),
  ),
  recommendations: z
    .array(
      z.strictObject({
        description: text,
        reason: z.string().nullable().optional(),
        status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).nullable().optional(),
      }),
    )
    .default([]),
};
export const createWorkOrderSchema = z.strictObject({ vehicleId: id, ...fields, ...children });
export const updateWorkOrderSchema = z
  .strictObject({ ...fields, ...children, exitDate: date.nullable() })
  .refine((value) => !value.exitDate || value.exitDate >= value.entryDate, "Exit precedes entry");
const page = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export const listWorkOrdersQuerySchema = z
  .strictObject({
    page: page.default(1),
    pageSize: page.pipe(z.number().max(100)).default(10),
    withEndDate: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(false),
  })
  .refine((value) => Number.isSafeInteger((value.page - 1) * value.pageSize));
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;
