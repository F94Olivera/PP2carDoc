import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { workOrders } from "./work-order.js";

export const workOrderItems = pgTable(
  "work_order_items",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    category: text("category", { enum: ["labor", "part", "other"] }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2, mode: "number" }).notNull(),
    unitPrice: integer("unit_price").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("work_order_items_work_order_id_idx").on(table.workOrderId),
    check("work_order_items_category_check", sql`${table.category} IN ('labor', 'part', 'other')`),
    check("work_order_items_quantity_check", sql`${table.quantity} > 0`),
    check("work_order_items_unit_price_check", sql`${table.unitPrice} >= 0`),
  ],
);

export type WorkOrderItem = typeof workOrderItems.$inferSelect;
export type NewWorkOrderItem = typeof workOrderItems.$inferInsert;
