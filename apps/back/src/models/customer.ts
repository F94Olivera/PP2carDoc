import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { userProfiles } from "./user-profile.js";

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    mechanicId: uuid("mechanic_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    documentNumber: text("document_number"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("customers_mechanic_id_idx").on(table.mechanicId),
    unique("customers_mechanic_id_document_number_key").on(table.mechanicId, table.documentNumber),
  ],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
