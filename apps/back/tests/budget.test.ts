import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { budgetPdfSchema, budgetItemAmount } from "@cardoc/types";
import { createBudgetPdf } from "../src/services/budget-service.js";
import { createBudgetPdfController } from "../src/controllers/budget-controller.js";
import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import { corsMiddleware } from "../src/middlewares/cors-middleware.js";

const input = {
  templateId: "classic" as const,
  customer: { fullName: "María Núñez" },
  vehicle: { name: "Peugeot 208", plate: "ab123cd" },
  date: "2026-10-17",
  items: [{ description: "Cambio de aceite y revisión", quantity: 1.5, unitPrice: 1500.25 }],
};

test("budget strictly validates independent fields, calendar, limits and numeric precision", () => {
  assert.equal(budgetPdfSchema.parse(input).vehicle.plate, "AB123CD");
  for (const bad of [
    {},
    { ...input, templateId: "modern" },
    { ...input, customerId: 1 },
    { ...input, customer: { fullName: "Ana", id: 1 } },
    { ...input, vehicle: { ...input.vehicle, id: 1 } },
    { ...input, date: "2026-02-29" },
    { ...input, date: "0000-01-01" },
    { ...input, items: [] },
    { ...input, items: Array(101).fill(input.items[0]) },
    { ...input, customer: { fullName: " " } },
    { ...input, customer: { fullName: "😀" } },
    { ...input, vehicle: { ...input.vehicle, plate: "µ" } },
    { ...input, customer: { fullName: "A\nB" } },
    { ...input, items: [{ ...input.items[0], description: "x".repeat(301) }] },
    ...[0, -1, NaN, Infinity, "1", 1.0001, 1_000_001].map((quantity) => ({
      ...input,
      items: [{ ...input.items[0], quantity }],
    })),
    ...[-1, NaN, Infinity, "0", 1.001, 1_000_000_001].map((unitPrice) => ({
      ...input,
      items: [{ ...input.items[0], unitPrice }],
    })),
    {
      ...input,
      items: [{ description: "Extreme", quantity: 1_000_000, unitPrice: 1_000_000_000 }],
    },
  ])
    assert.equal(budgetPdfSchema.safeParse(bad).success, false);
  assert.ok(
    budgetPdfSchema.safeParse({
      ...input,
      date: "2024-02-29",
      items: [{ description: "Sin cargo", quantity: 1.001, unitPrice: 0 }],
    }).success,
  );
  assert.equal(budgetItemAmount({ description: "", quantity: 3, unitPrice: 0.1 }), 0.3);
  assert.equal(budgetItemAmount(input.items[0]!), 2250.38);
  assert.equal(budgetItemAmount({ description: "", quantity: 1.005, unitPrice: 1 }), 1.01);
});

test("classic generator produces parseable A4 PDFs and paginates long rows without external services", async () => {
  const one = await createBudgetPdf(budgetPdfSchema.parse(input));
  assert.equal(Buffer.from(one).subarray(0, 5).toString(), "%PDF-");
  const doc = await PDFDocument.load(one);
  assert.equal(doc.getPageCount(), 1);
  assert.equal(Math.round(doc.getPage(0).getWidth()), 595);
  const many = await PDFDocument.load(
    await createBudgetPdf(
      budgetPdfSchema.parse({
        ...input,
        items: Array.from({ length: 100 }, (_, i) => ({
          description: `${i} ${"Descripción larga áéíóú ñ ".repeat(11)}`,
          quantity: 100,
          unitPrice: 999999999.99,
        })),
      }),
    ),
  );
  assert.ok(many.getPageCount() > 1);
});

test("controller rejects bad inputs and returns a private downloadable PDF", async () => {
  let status = 200;
  let body: unknown;
  const headers: Record<string, string> = {};
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    send(value: unknown) {
      body = value;
    },
  } as unknown as Parameters<typeof createBudgetPdfController>[1];
  await createBudgetPdfController(
    { body: {} } as Parameters<typeof createBudgetPdfController>[0],
    response,
    () => {},
  );
  assert.equal(status, 400);
  assert.ok((body as { error: string }).error);
  status = 200;
  await createBudgetPdfController(
    { body: input } as Parameters<typeof createBudgetPdfController>[0],
    response,
    () => {},
  );
  assert.equal(status, 200);
  assert.equal(headers["Content-Type"], "application/pdf");
  assert.equal(headers["Content-Disposition"], 'attachment; filename="presupuesto-2026-10-17.pdf"');
  assert.equal(headers["Cache-Control"], "no-store");
  assert.ok(Buffer.isBuffer(body));
  assert.equal((await PDFDocument.load(body as Buffer)).getPageCount(), 1);
});

test("PDF route is registered behind authentication and CORS exposes filename", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.ok(
    source.indexOf("protectedRouter.use(requireAuth)") <
      source.indexOf('protectedRouter.post("/budgets/pdf"'),
  );
  const headers: Record<string, unknown> = {};
  corsMiddleware(
    { method: "POST" } as Request,
    {
      setHeader: (key: string, value: unknown) => {
        headers[key] = value;
      },
    } as unknown as Response,
    () => {},
  );
  assert.match(String(headers["Access-Control-Expose-Headers"]), /Content-Disposition/);
});
