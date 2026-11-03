import { and, asc, count, eq, sql } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import { customers, type Customer } from "../models/customer.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type {
  ListCustomersQuery,
  UpdateCustomerInput,
  CreateCustomerInput,
} from "../schemas/customer.js";

const ownershipFilter = (context: AuthorizationContext) =>
  context.role === "GOD"
    ? undefined
    : context.role === "USER"
      ? and(
          eq(customers.userId, context.userId),
          eq(customers.uuid, context.customerId ?? "00000000-0000-0000-0000-000000000000"),
        )
      : eq(customers.mechanicId, context.userId);

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

export const insertCustomer = (
  context: AuthorizationContext,
  input: CreateCustomerInput & { mechanicId: string },
) =>
  withUserDatabase(context, async (transaction) => {
    const [result] = await transaction.execute(
      sql`select private.create_customer_account(${JSON.stringify(input)}::jsonb) as id`,
    );
    if (!result?.id) return null;
    const [customer] = await transaction
      .select()
      .from(customers)
      .where(eq(customers.id, Number(result.id)));
    return customer ?? null;
  });

export const resetCustomerPasswordById = (
  context: AuthorizationContext,
  customerId: number,
  password: string,
) =>
  withUserDatabase(context, async (tx) => {
    const [result] = await tx.execute(
      sql`select private.reset_customer_password(${customerId}, ${password}) as changed`,
    );
    return result?.changed === true;
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
    const [result] = await transaction.execute(
      sql`select private.delete_customer_account(${customerId}) as deleted`,
    );
    return result?.deleted ? { id: customerId } : undefined;
  });
