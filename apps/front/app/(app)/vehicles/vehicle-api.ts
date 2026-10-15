import type {
  CreateVehicleRequest,
  UpdateVehicleRequest,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  PaginatedResponse,
  VehicleResponse,
  WorkOrderResponse,
} from "@cardoc/types";
import {
  fetchAuthenticated,
  getErrorMessage,
  handleUnauthorizedResponse,
} from "../../lib/auth-client";

const requestJson = async <T>(path: string, fallbackError: string, init?: RequestInit) => {
  const response = await fetchAuthenticated(path, {
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
};

export const listVehicles = ({
  fallbackError,
  includeArchived = false,
  page = 1,
  pageSize = 100,
}: {
  fallbackError: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (includeArchived) {
    query.set("includeArchived", "true");
  }

  return requestJson<PaginatedResponse<VehicleResponse>>(`/vehicles?${query}`, fallbackError);
};

export const createVehicle = (vehicle: CreateVehicleRequest, fallbackError: string) =>
  requestJson<VehicleResponse>("/vehicles", fallbackError, {
    body: JSON.stringify(vehicle),
    method: "POST",
  });

export const getVehicle = (vehicleId: string, fallbackError: string) =>
  requestJson<VehicleResponse>(`/vehicles/${vehicleId}`, fallbackError);

export const updateVehicle = (
  vehicleId: number,
  vehicle: UpdateVehicleRequest,
  fallbackError: string,
) =>
  requestJson<VehicleResponse>(`/vehicles/${vehicleId}`, fallbackError, {
    body: JSON.stringify(vehicle),
    method: "PUT",
  });

export const archiveVehicle = (vehicleId: number, isActive: boolean, fallbackError: string) =>
  requestJson<VehicleResponse>(`/vehicles/${vehicleId}/archive`, fallbackError, {
    body: JSON.stringify({ isActive }),
    method: "PATCH",
  });

export const deleteVehicle = async (vehicleId: number, fallbackError: string) => {
  const response = await fetchAuthenticated(`/vehicles/${vehicleId}`, {
    headers: {
      Accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }
};

export const listWorkOrdersByVehicle = ({
  fallbackError,
  page,
  pageSize,
  vehicleId,
  withEndDate = false,
}: {
  fallbackError: string;
  page: number;
  pageSize: number;
  vehicleId: number;
  withEndDate?: boolean;
}) => {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (withEndDate) {
    query.set("withEndDate", "true");
  }

  return requestJson<PaginatedResponse<WorkOrderResponse>>(
    `/vehicles/${vehicleId}/work-orders?${query}`,
    fallbackError,
  );
};

export const createWorkOrder = (workOrder: CreateWorkOrderRequest, fallbackError: string) =>
  requestJson<WorkOrderResponse>("/work-orders", fallbackError, {
    body: JSON.stringify(workOrder),
    method: "POST",
  });

export const getWorkOrder = (workOrderId: number | string, fallbackError: string) =>
  requestJson<WorkOrderResponse>(`/work-orders/${workOrderId}`, fallbackError);

export const updateWorkOrder = (
  vehicleId: number,
  workOrderId: number,
  workOrder: UpdateWorkOrderRequest,
  fallbackError: string,
) =>
  requestJson<WorkOrderResponse>(
    `/vehicles/${vehicleId}/work-orders/${workOrderId}`,
    fallbackError,
    {
      body: JSON.stringify(workOrder),
      method: "PUT",
    },
  );

export const deleteWorkOrder = async (workOrderId: number, fallbackError: string) => {
  const response = await fetchAuthenticated(`/work-orders/${workOrderId}`, {
    headers: {
      Accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response);
    throw new Error(await getErrorMessage(response, fallbackError));
  }
};

export const listAllVehicles = async (options: {
  fallbackError: string;
  includeArchived?: boolean;
}) => {
  const data: VehicleResponse[] = [];
  let page = 1;
  while (true) {
    const response = await listVehicles({ ...options, page, pageSize: 100 });
    data.push(...response.data);
    if (!response.meta.hasNextPage) return { ...response, data };
    page++;
  }
};

export const listAllWorkOrdersByVehicle = async (options: {
  fallbackError: string;
  vehicleId: number;
  withEndDate?: boolean;
}) => {
  const data: WorkOrderResponse[] = [];
  for (let page = 1; ; page++) {
    const response = await listWorkOrdersByVehicle({ ...options, page, pageSize: 100 });
    data.push(...response.data);
    if (!response.meta.hasNextPage) return { ...response, data };
  }
};
