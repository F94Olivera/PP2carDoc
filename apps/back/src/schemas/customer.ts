import { z } from "zod";

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

export const listCustomersQuerySchema = z.strictObject({
  page: positiveInteger.default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(10),
  includeArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export const customerByIdParamsSchema = z.strictObject({
  customerId: positiveInteger.pipe(z.number().max(2147483647)),
});

// Fields mirror the Drizzle customer model; generated IDs/dates are never writable.
const customerFields = {
  firstName: z.string().trim().min(1).max(200),
  lastName: z.string().max(200).nullable().optional(),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: z.string().max(100).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  documentNumber: z.string().trim().min(1).max(100).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
};
export const createCustomerSchema = z.strictObject({
  ...customerFields,
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password must fit 72 UTF-8 bytes",
    ),
  mechanicId: z.uuid().optional(),
});
const { email: immutableEmail, ...editableCustomerFields } = customerFields;
void immutableEmail;
export const resetCustomerPasswordSchema = z.strictObject({
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password must fit 72 UTF-8 bytes",
    ),
});
export const updateCustomerSchema = z
  .strictObject({ ...editableCustomerFields, isActive: z.boolean().optional() })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
