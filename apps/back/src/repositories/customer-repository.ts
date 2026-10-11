import { and, asc, count, eq } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import { userProfiles } from "../models/user-profile.js";
import { customers, type Customer, type NewCustomer } from "../models/customer.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type { ListCustomersQuery, UpdateCustomerInput } from "../schemas/customer.js";

const ownershipFilter = (context: AuthorizationContext) =>
  context.role === "GOD" ? undefined : eq(customers.mechanicId, context.userId);

export const findCustomers = (
  context: AuthorizationContext,
  { page, pageSize, includeArchived }: ListCustomersQuery,
) =>
  withUserDatabase(
    context,
    async (transaction) => {
      const filter = and(
        ownershipFilter(context),
        includeArchived ? undefined : eq(customers.isActive, true),
      );
      const [summary] = await transaction.select({ total: count() }).from(customers).where(filter);
      const rows = await transaction
        .select()
        .from(customers)
        .where(filter)
        .orderBy(asc(customers.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { rows, total: summary!.total };
    },
    true,
  );

export const findCustomerById = (
  context: AuthorizationContext,
  customerId: number,
): Promise<Customer | undefined> =>
  withUserDatabase(
    context,
    async (transaction) => {
      const [customer] = await transaction
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), ownershipFilter(context)))
        .limit(1);
      return customer;
    },
    true,
  );

export const insertCustomer = (context: AuthorizationContext, input: NewCustomer) =>
  withUserDatabase(context, async (transaction) => {
    const [owner] = await transaction
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(and(eq(userProfiles.id, input.mechanicId), eq(userProfiles.role, "MECHANIC")));
    if (!owner) return null;
    const [customer] = await transaction.insert(customers).values(input).returning();
    return customer!;
  });

export const updateCustomerById = (
  context: AuthorizationContext,
  customerId: number,
  input: UpdateCustomerInput,
): Promise<Customer | undefined> =>
  withUserDatabase(context, async (transaction) => {
    const [customer] = await transaction
      .update(customers)
      .set(input)
      .where(and(eq(customers.id, customerId), ownershipFilter(context)))
      .returning();
    return customer;
  });

export const deleteCustomerById = (context: AuthorizationContext, customerId: number) =>
  withUserDatabase(context, async (transaction) => {
    const [customer] = await transaction
      .delete(customers)
      .where(and(eq(customers.id, customerId), ownershipFilter(context)))
      .returning({ id: customers.id });
    return customer;
  });
