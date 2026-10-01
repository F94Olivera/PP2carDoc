import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { workOrders } from "./work-order.js";

export const workOrderRecommendations = pgTable(
  "work_order_recommendations",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    reason: text("reason"),
    status: text("status", { enum: ["pending", "accepted", "rejected"] }),
    priority: text("priority", { enum: ["low", "medium", "high"] }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("work_order_recommendations_work_order_id_idx").on(table.workOrderId),
    check(
      "work_order_recommendations_status_check",
      sql`${table.status} IS NULL OR ${table.status} IN ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "work_order_recommendations_priority_check",
      sql`${table.priority} IS NULL OR ${table.priority} IN ('low', 'medium', 'high')`,
    ),
  ],
);

export type WorkOrderRecommendation = typeof workOrderRecommendations.$inferSelect;
export type NewWorkOrderRecommendation = typeof workOrderRecommendations.$inferInsert;
