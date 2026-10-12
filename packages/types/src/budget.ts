import { z } from "zod";

// Work in integer thousandths and cents so half-cent rounding is deterministic.
const itemCents = (item: { quantity: number; unitPrice: number }): number => {
  const quantity = Math.round(item.quantity * 1000);
  const price = Math.round(item.unitPrice * 100);
  if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(price)) return Infinity;
  return Number((BigInt(quantity) * BigInt(price) + BigInt(500)) / BigInt(1000));
};

// Classic uses embedded PDF standard fonts: printable Latin-1 covers Spanish.
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[\x20-\x7e\xa0-\xff]+$/, "Usá caracteres latinos sin saltos de línea.");
export const budgetPdfSchema = z
  .strictObject({
    templateId: z.literal("classic"),
    customer: z.strictObject({ fullName: text(120) }),
    vehicle: z.strictObject({
      name: text(120),
      plate: text(30)
        .transform((value) => value.toUpperCase())
        .pipe(text(30)),
    }),
    date: z.iso.date().refine((value) => !value.startsWith("0000-")),
    items: z
      .array(
        z.strictObject({
          description: text(300),
          quantity: z
            .number()
            .min(1)
            .max(1_000_000)
            .refine(
              (value) =>
                Number.isSafeInteger(Math.round(value * 1000)) &&
                Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6,
              "Hasta tres decimales en cantidad.",
            ),
          unitPrice: z
            .number()
            .min(0)
            .max(1_000_000_000)
            .refine(
              (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-5,
              "Hasta dos decimales en precio.",
            ),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) =>
      value.items.reduce((sum, item) => sum + itemCents(item), 0) <= Number.MAX_SAFE_INTEGER,
    "Total demasiado grande.",
  );

export type CreateBudgetPdfRequest = z.infer<typeof budgetPdfSchema>;
export type BudgetPdfTemplateId = CreateBudgetPdfRequest["templateId"];
export type BudgetPdfItemRequest = CreateBudgetPdfRequest["items"][number];
export const budgetItemAmount = (item: BudgetPdfItemRequest) => itemCents(item) / 100;
