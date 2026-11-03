"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { VehicleResponse, WorkOrderResponse } from "@cardoc/types";
import { useI18n } from "../../../../../i18n/use-i18n";
import { useVerifiedUser } from "../../../../auth-guard";
import { getVehicle, getWorkOrder } from "../../../../vehicles/vehicle-api";
import { WorkOrderReadView } from "../../../../work-orders/work-order-read-view";

export default function MyServicePage() {
  const { vehicleId, workOrderId } = useParams<{ vehicleId: string; workOrderId: string }>();
  const key = `${vehicleId}/${workOrderId}`;
  const { t } = useI18n();
  const user = useVerifiedUser();
  const [state, setState] = useState<{
    key: string;
    vehicle?: VehicleResponse;
    order?: WorkOrderResponse;
    loading: boolean;
    error?: string;
  }>({ key, loading: true });
  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (!active) return;
      setState({ key, loading: true });
      try {
        const [vehicle, order] = await Promise.all([
          getVehicle(vehicleId, t.portal.error),
          getWorkOrder(workOrderId, t.portal.error),
        ]);
        if (order.vehicleId !== vehicle.id) throw new Error(t.portal.error);
        if (active) setState({ key, vehicle, order, loading: false });
      } catch (error) {
        if (active)
          setState({
            key,
            loading: false,
            error: error instanceof Error ? error.message : t.portal.error,
          });
      }
    });
    return () => {
      active = false;
    };
  }, [key, vehicleId, workOrderId, t.portal.error]);
  return (
    <div>
      <Link href={`/myvehicles/${vehicleId}`}>← {t.portal.back}</Link>
      {state.key !== key || state.loading ? (
        <p role="status" className="mt-6">
          {t.portal.loading}
        </p>
      ) : state.error ? (
        <p role="alert" className="mt-6 text-red-600">
          {state.error}
        </p>
      ) : state.order && state.vehicle ? (
        <>
          <h2 className="mt-6 text-2xl font-semibold">
            WO-{String(state.order.id).padStart(6, "0")}
          </h2>
          <WorkOrderReadView
            customerName={user?.email ?? "-"}
            vehicle={state.vehicle}
            workOrder={state.order}
          />
        </>
      ) : null}
    </div>
  );
}
