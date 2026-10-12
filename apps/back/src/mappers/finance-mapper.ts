import type { FinanceResponse } from "@cardoc/types";

export const toFinanceResponse = (value: unknown): FinanceResponse => {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error("Invalid finance aggregate");
  }
  const total = Number(value);
  if ((typeof value === "string" && value.trim() === "") || !Number.isFinite(total) || total < 0) {
    throw new Error("Invalid finance aggregate");
  }
  return { total };
};
