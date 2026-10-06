export type WorkOrderItemCategory = "labor" | "part" | "other";
export type WorkOrderRecommendationStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type WorkOrderRecommendationPriority = "low" | "medium" | "high";

export type CreateWorkOrderItemRequest = {
  description: string;
  category?: WorkOrderItemCategory;
  quantity: number;
  unitPrice: number;
};

export type CreateWorkOrderRecommendationRequest = {
  description: string;
  reason?: string | null;
  status?: WorkOrderRecommendationStatus | null;
  priority?: WorkOrderRecommendationPriority | null;
};

export type CreateWorkOrderRequest = {
  vehicleId: number;
  entryDate: string;
  exitDate?: string | null;
  intakeOdometer?: number | null;
  reportedProblem?: string;
  notes?: string | null;
  diagnosis?: string | null;
  items: CreateWorkOrderItemRequest[];
  recommendations?: CreateWorkOrderRecommendationRequest[];
};

export type WorkOrderItemResponse = {
  id: number;
  workOrderId: number;
  description: string;
  category: WorkOrderItemCategory;
  quantity: number;
  unitPrice: number;
};

export type WorkOrderRecommendationResponse = {
  id: number;
  workOrderId: number;
  description: string;
  reason: string | null;
  status: WorkOrderRecommendationStatus | null;
  priority: WorkOrderRecommendationPriority | null;
};

export type WorkOrderResponse = {
  id: number;
  vehicleId: number;
  entryDate: string;
  exitDate: string | null;
  intakeOdometer: number | null;
  reportedProblem: string;
  notes: string | null;
  diagnosis: string | null;
  items: WorkOrderItemResponse[];
  recommendations: WorkOrderRecommendationResponse[];
};
