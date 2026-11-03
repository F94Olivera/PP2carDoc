import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";

// The demo schema owns the FK to Supabase's managed auth.users table.
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey(),
    role: text("role", { enum: ["GOD", "MECHANIC", "USER"] })
      .notNull()
      .default("USER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("user_profiles_role_check", sql`${table.role} IN ('GOD', 'MECHANIC', 'USER')`)],
);
