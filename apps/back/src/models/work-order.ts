import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { vehicles } from "./vehicle.js";

export const workOrders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "restrict" }),
  entryDate: integer("entry_date", { mode: "timestamp" }).notNull(),
  exitDate: integer("exit_date", { mode: "timestamp" }),
  intakeOdometer: integer("intake_odometer"),
  reportedProblem: text("reported_problem").notNull(), notes: text("notes"), diagnosis: text("diagnosis"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
}, (table) => [
  index("work_orders_vehicle_id_idx").on(table.vehicleId),
  check("work_orders_intake_odometer_check", sql`${table.intakeOdometer} IS NULL OR ${table.intakeOdometer} >= 0`),
  check("work_orders_exit_date_check", sql`${table.exitDate} IS NULL OR ${table.exitDate} >= ${table.entryDate}`),
]);

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
