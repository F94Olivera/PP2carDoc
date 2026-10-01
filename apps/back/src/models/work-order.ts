import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { vehicles } from "./vehicle.js";

export const workOrders = pgTable(
  "work_orders",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    entryDate: timestamp("entry_date").notNull(),
    exitDate: timestamp("exit_date"),
    intakeOdometer: integer("intake_odometer"),
    reportedProblem: text("reported_problem").notNull(),
    notes: text("notes"),
    diagnosis: text("diagnosis"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("work_orders_vehicle_id_idx").on(table.vehicleId),
    check(
      "work_orders_intake_odometer_check",
      sql`${table.intakeOdometer} IS NULL OR ${table.intakeOdometer} >= 0`,
    ),
    check(
      "work_orders_exit_date_check",
      sql`${table.exitDate} IS NULL OR ${table.exitDate} >= ${table.entryDate}`,
    ),
  ],
);

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
