import type { WorkOrderResponse, WorkOrderRecommendationStatus } from "@cardoc/types";
import type { WorkOrder } from "../models/work-order.js";
import type { WorkOrderItem } from "../models/work-order-item.js";
import type { WorkOrderRecommendation } from "../models/work-order-recommendation.js";
export type WorkOrderAggregate = {
  order: WorkOrder;
  items: WorkOrderItem[];
  recommendations: WorkOrderRecommendation[];
};
const statuses = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
} as const satisfies Record<string, WorkOrderRecommendationStatus>;
export const toWorkOrderResponse = ({
  order,
  items,
  recommendations,
}: WorkOrderAggregate): WorkOrderResponse => ({
  id: order.id,
  vehicleId: order.vehicleId,
  entryDate: order.entryDate.toISOString(),
  exitDate: order.exitDate?.toISOString() ?? null,
  intakeOdometer: order.intakeOdometer,
  reportedProblem: order.reportedProblem,
  notes: order.notes,
  diagnosis: order.diagnosis,
  items: items.map((item) => ({
    id: item.id,
    workOrderId: item.workOrderId,
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })),
  recommendations: recommendations.map((item) => ({
    id: item.id,
    workOrderId: item.workOrderId,
    description: item.description,
    reason: item.reason,
    status: item.status ? statuses[item.status] : null,
    priority: item.priority,
  })),
});
