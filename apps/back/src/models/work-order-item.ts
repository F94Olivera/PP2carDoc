import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { workOrders } from "./work-order.js";

export const workOrderItems = sqliteTable("work_order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  description: text("description").notNull(), category: text("category", { enum: ["labor", "part", "other"] }).notNull(),
  quantity: real("quantity").notNull(), unitPrice: integer("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
}, (table) => [
  index("work_order_items_work_order_id_idx").on(table.workOrderId),
  check("work_order_items_category_check", sql`${table.category} IN ('labor', 'part', 'other')`),
  check("work_order_items_quantity_check", sql`${table.quantity} > 0`),
  check("work_order_items_unit_price_check", sql`${table.unitPrice} >= 0`),
]);

export type WorkOrderItem = typeof workOrderItems.$inferSelect;
export type NewWorkOrderItem = typeof workOrderItems.$inferInsert;
