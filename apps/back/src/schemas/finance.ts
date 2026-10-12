import { z } from "zod";
import type { FinanceQuery } from "@cardoc/types";

// Query-only endpoint: no writable persistence fields. Reject arrays and unknown keys.
const calendarDate = z.iso.date().refine((value) => !value.startsWith("0000-"));
export const financeQuerySchema = z
  .strictObject({
    startDate: calendarDate,
    endDate: calendarDate,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate",
  }) satisfies z.ZodType<FinanceQuery>;
