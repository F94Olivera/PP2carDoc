import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { customers } from "./customer.js";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  licensePlate: text("license_plate").notNull().unique(),
  make: text("make").notNull(), model: text("model").notNull(), year: integer("year"),
  initialOdometer: integer("initial_odometer"), odometerUnit: text("odometer_unit", { enum: ["km", "mi"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
}, (table) => [
  index("vehicles_customer_id_idx").on(table.customerId),
  check("vehicles_year_check", sql`${table.year} IS NULL OR ${table.year} >= 1886`),
  check("vehicles_initial_odometer_check", sql`${table.initialOdometer} IS NULL OR ${table.initialOdometer} >= 0`),
  check("vehicles_odometer_unit_check", sql`${table.odometerUnit} IN ('km', 'mi')`),
]);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
