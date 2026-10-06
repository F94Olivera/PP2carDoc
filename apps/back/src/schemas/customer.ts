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
