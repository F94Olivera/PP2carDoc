import { and, asc, count, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import { customers } from "../models/customer.js";
import { vehicles } from "../models/vehicle.js";
import { workOrders, type WorkOrder } from "../models/work-order.js";
import { workOrderItems } from "../models/work-order-item.js";
import { workOrderRecommendations } from "../models/work-order-recommendation.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  ListWorkOrdersQuery,
} from "../schemas/work-order.js";
import type { WorkOrderAggregate } from "../mappers/work-order-mapper.js";
type Transaction = Parameters<Parameters<typeof withUserDatabase>[1]>[0];
const parentFilter = (context: AuthorizationContext) =>
  and(
    eq(vehicles.isActive, true),
    eq(customers.isActive, true),
    context.role === "GOD" ? undefined : eq(customers.mechanicId, context.userId),
  );
const lockParent = async (tx: Transaction, context: AuthorizationContext, vehicleId: number) => {
  const [parent] = await tx
    .select({ id: vehicles.id })
    .from(vehicles)
    .innerJoin(customers, eq(vehicles.customerId, customers.id))
    .where(and(eq(vehicles.id, vehicleId), parentFilter(context)))
    .for("share");
  return parent;
};
const readChildren = async (
  tx: Transaction,
  orders: WorkOrder[],
): Promise<WorkOrderAggregate[]> => {
  if (!orders.length) return [];
  const ids = orders.map((order) => order.id);
  const items = await tx
    .select()
    .from(workOrderItems)
    .where(inArray(workOrderItems.workOrderId, ids))
    .orderBy(asc(workOrderItems.id));
  const recommendations = await tx
    .select()
    .from(workOrderRecommendations)
    .where(inArray(workOrderRecommendations.workOrderId, ids))
    .orderBy(asc(workOrderRecommendations.id));
  return orders.map((order) => ({
    order,
    items: items.filter((item) => item.workOrderId === order.id),
    recommendations: recommendations.filter((item) => item.workOrderId === order.id),
  }));
};
const selectOrder = (tx: Transaction, context: AuthorizationContext, id: number) =>
  tx
    .select({ order: workOrders })
    .from(workOrders)
    .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
    .innerJoin(customers, eq(vehicles.customerId, customers.id))
    .where(and(eq(workOrders.id, id), parentFilter(context)));
export const findWorkOrderById = (context: AuthorizationContext, id: number) =>
  withUserDatabase(
    context,
    async (tx) => {
      const [row] = await selectOrder(tx, context, id);
      return row ? (await readChildren(tx, [row.order]))[0] : undefined;
    },
    true,
  );
export const findWorkOrders = (
  context: AuthorizationContext,
  vehicleId: number,
  query: ListWorkOrdersQuery,
) =>
  withUserDatabase(
    context,
    async (tx) => {
      const filter = and(
        eq(workOrders.vehicleId, vehicleId),
        parentFilter(context),
        query.withEndDate ? isNotNull(workOrders.exitDate) : isNull(workOrders.exitDate),
      );
      const [summary] = await tx
        .select({ total: count() })
        .from(workOrders)
        .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(filter);
      const rows = await tx
        .select({ order: workOrders })
        .from(workOrders)
        .innerJoin(vehicles, eq(workOrders.vehicleId, vehicles.id))
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(filter)
        .orderBy(asc(workOrders.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize);
      return {
        rows: await readChildren(
          tx,
          rows.map((row) => row.order),
        ),
        total: summary!.total,
      };
    },
    true,
  );
const orderFields = (input: CreateWorkOrderInput | UpdateWorkOrderInput) => ({
  entryDate: input.entryDate,
  reportedProblem: input.reportedProblem,
  intakeOdometer: input.intakeOdometer ?? null,
  notes: input.notes ?? null,
  diagnosis: input.diagnosis ?? null,
});
const insertChildren = async (
  tx: Transaction,
  workOrderId: number,
  input: CreateWorkOrderInput | UpdateWorkOrderInput,
) => {
  const items = input.items.length
    ? await tx
        .insert(workOrderItems)
        .values(input.items.map((item) => ({ ...item, workOrderId })))
        .returning()
    : [];
  const recommendations = input.recommendations.length
    ? await tx
        .insert(workOrderRecommendations)
        .values(
          input.recommendations.map((item) => ({
            ...item,
            workOrderId,
            status:
              (item.status?.toLowerCase() as "pending" | "accepted" | "rejected" | undefined) ??
              null,
          })),
        )
        .returning()
    : [];
  return { items, recommendations };
};
export const insertWorkOrder = (context: AuthorizationContext, input: CreateWorkOrderInput) =>
  withUserDatabase(context, async (tx) => {
    if (!(await lockParent(tx, context, input.vehicleId))) return undefined;
    const fields = orderFields(input);
    const [order] = await tx
      .insert(workOrders)
      .values({ ...fields, vehicleId: input.vehicleId, exitDate: null })
      .returning();
    return { order: order!, ...(await insertChildren(tx, order!.id, input)) };
  });
export const replaceWorkOrderById = (
  context: AuthorizationContext,
  vehicleId: number,
  id: number,
  input: UpdateWorkOrderInput,
) =>
  withUserDatabase(context, async (tx) => {
    if (!(await lockParent(tx, context, vehicleId))) return undefined;
    const fields = orderFields(input);
    const [order] = await tx
      .update(workOrders)
      .set({
        ...fields,
        exitDate: input.exitDate,
        notes: fields.notes ?? null,
        diagnosis: fields.diagnosis ?? null,
        intakeOdometer: fields.intakeOdometer ?? null,
      })
      .where(and(eq(workOrders.id, id), eq(workOrders.vehicleId, vehicleId)))
      .returning();
    if (!order) return undefined;
    await tx.delete(workOrderItems).where(eq(workOrderItems.workOrderId, id));
    await tx.delete(workOrderRecommendations).where(eq(workOrderRecommendations.workOrderId, id));
    return { order, ...(await insertChildren(tx, id, input)) };
  });
export const deleteWorkOrderById = (context: AuthorizationContext, id: number) =>
  withUserDatabase(context, async (tx) => {
    const [row] = await selectOrder(tx, context, id);
    if (!row || !(await lockParent(tx, context, row.order.vehicleId))) return undefined;
    const [deleted] = await tx
      .delete(workOrders)
      .where(eq(workOrders.id, id))
      .returning({ id: workOrders.id });
    return deleted;
  });
