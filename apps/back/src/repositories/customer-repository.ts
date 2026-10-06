import { asc, count, eq } from "drizzle-orm";
import { initializeDatabase } from "../database.js";
import { customers } from "../models/customer.js";
import type { ListCustomersQuery } from "../schemas/customer.js";

export const findCustomers = async ({ page, pageSize, includeArchived }: ListCustomersQuery) => {
  const database = await initializeDatabase();
  const filter = includeArchived ? undefined : eq(customers.isActive, true);

  // Keep rows and pagination totals consistent within the same database snapshot.
  return database.transaction(
    async (transaction) => {
      const [summary] = await transaction.select({ total: count() }).from(customers).where(filter);
      const rows = await transaction
        .select()
        .from(customers)
        .where(filter)
        .orderBy(asc(customers.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return { rows, total: summary.total };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
};

export const findCustomerById = async (customerId: number) => {
  const database = await initializeDatabase();
  const [customer] = await database
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  return customer;
};
