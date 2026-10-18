import { and, asc, count, eq, inArray } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import { customers, type Customer } from "../models/customer.js";
import { vehicles, type Vehicle } from "../models/vehicle.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  ListVehiclesQuery,
} from "../schemas/vehicle.js";
const parentFilter = (context: AuthorizationContext) =>
  and(
    eq(customers.isActive, true),
    context.role === "GOD" ? undefined : eq(customers.mechanicId, context.userId),
  );
export const findVehicles = (context: AuthorizationContext, query: ListVehiclesQuery) =>
  withUserDatabase(
    context,
    async (tx) => {
      const filter = and(
        parentFilter(context),
        query.includeArchived ? undefined : eq(vehicles.isActive, true),
        query.customerId ? eq(vehicles.customerId, query.customerId) : undefined,
      );
      const [summary] = await tx
        .select({ total: count() })
        .from(vehicles)
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(filter);
      const rows = await tx
        .select({ vehicle: vehicles })
        .from(vehicles)
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(filter)
        .orderBy(asc(vehicles.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize);
      return { rows: rows.map((row) => row.vehicle), total: summary!.total };
    },
    true,
  );
export const findVehicleById = (
  context: AuthorizationContext,
  id: number,
): Promise<Vehicle | undefined> =>
  withUserDatabase(
    context,
    async (tx) => {
      const [row] = await tx
        .select({ vehicle: vehicles })
        .from(vehicles)
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(and(eq(vehicles.id, id), parentFilter(context)))
        .limit(1);
      return row?.vehicle;
    },
    true,
  );
// Read the parent in the same authorized snapshot; services keep the business checks.
export const findVehicleDetailById = (
  context: AuthorizationContext,
  id: number,
): Promise<{ vehicle: Vehicle; customer: Customer } | undefined> =>
  withUserDatabase(
    context,
    async (tx) => {
      const [row] = await tx
        .select({ vehicle: vehicles, customer: customers })
        .from(vehicles)
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(and(eq(vehicles.id, id), parentFilter(context)))
        .limit(1);
      return row;
    },
    true,
  );
export const insertVehicle = (
  context: AuthorizationContext,
  input: CreateVehicleInput,
): Promise<Vehicle | undefined> =>
  withUserDatabase(context, async (tx) => {
    const [parent] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, input.customerId), parentFilter(context)))
      .for("share");
    if (!parent) return undefined;
    const [row] = await tx.insert(vehicles).values(input).returning();
    return row;
  });
const accessibleParents = (
  tx: Parameters<Parameters<typeof withUserDatabase>[1]>[0],
  context: AuthorizationContext,
) => tx.select({ id: customers.id }).from(customers).where(parentFilter(context));
export const updateVehicleById = (
  context: AuthorizationContext,
  id: number,
  input: UpdateVehicleInput | { isActive: boolean },
): Promise<Vehicle | undefined> =>
  withUserDatabase(context, async (tx) => {
    const [row] = await tx
      .update(vehicles)
      .set(input)
      .where(and(eq(vehicles.id, id), inArray(vehicles.customerId, accessibleParents(tx, context))))
      .returning();
    return row;
  });
export const deleteVehicleById = (
  context: AuthorizationContext,
  id: number,
): Promise<{ id: number } | undefined> =>
  withUserDatabase(context, async (tx) => {
    const [row] = await tx
      .delete(vehicles)
      .where(and(eq(vehicles.id, id), inArray(vehicles.customerId, accessibleParents(tx, context))))
      .returning({ id: vehicles.id });
    return row;
  });
