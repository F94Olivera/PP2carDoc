"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { VehicleResponse, WorkOrderResponse } from "@cardoc/types";
import { useI18n } from "../../../i18n/use-i18n";
import { useVerifiedUser } from "../../auth-guard";
import { getVehicle, listAllWorkOrdersByVehicle } from "../../vehicles/vehicle-api";
import { VehicleReadView } from "../../vehicles/vehicle-read-view";

export default function MyVehiclePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { t } = useI18n();
  const user = useVerifiedUser();
  const [state, setState] = useState<{
    id: string;
    vehicle: VehicleResponse | null;
    error: string | null;
    loading: boolean;
  }>({ id: vehicleId, vehicle: null, error: null, loading: true });
  const [history, setHistory] = useState<{
    id: string;
    rows: WorkOrderResponse[];
    error: string | null;
    loading: boolean;
  }>({ id: vehicleId, rows: [], error: null, loading: true });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (!active) return;
      setState({ id: vehicleId, vehicle: null, error: null, loading: true });
      setHistory({ id: vehicleId, rows: [], error: null, loading: true });
      setPage(1);
      try {
        const vehicle = await getVehicle(vehicleId, t.portal.error);
        if (!active) return;
        setState({ id: vehicleId, vehicle, error: null, loading: false });
        try {
          const [open, closed] = await Promise.all(
            [false, true].map((withEndDate) =>
              listAllWorkOrdersByVehicle({
                vehicleId: vehicle.id,
                withEndDate,
                fallbackError: t.portal.error,
              }),
            ),
          );
          if (active)
            setHistory({
              id: vehicleId,
              rows: [...open.data, ...closed.data].sort((a, b) => b.id - a.id),
              error: null,
              loading: false,
            });
        } catch (error) {
          if (active)
            setHistory({
              id: vehicleId,
              rows: [],
              error: error instanceof Error ? error.message : t.portal.error,
              loading: false,
            });
        }
      } catch (error) {
        if (active)
          setState({
            id: vehicleId,
            vehicle: null,
            error: error instanceof Error ? error.message : t.portal.error,
            loading: false,
          });
      }
    });
    return () => {
      active = false;
    };
  }, [vehicleId, t.portal.error]);
  const rows = history.rows.filter(
    (row) =>
      filter === "all" || (filter === "closed" ? row.exitDate !== null : row.exitDate === null),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  return (
    <div>
      <Link href="/myvehicles">← {t.portal.back}</Link>
      {state.id !== vehicleId || state.loading ? (
        <p role="status" className="mt-6">
          {t.portal.loading}
        </p>
      ) : state.error ? (
        <p role="alert" className="mt-6 text-red-600">
          {state.error}
        </p>
      ) : state.vehicle ? (
        <>
          <h2 className="mt-6 text-2xl font-semibold">{state.vehicle.licensePlate}</h2>
          <VehicleReadView vehicle={state.vehicle} customerName={user?.email ?? "-"} />
          <section className="mt-8">
            <h3 className="text-xl font-semibold">{t.portal.services}</h3>
            <label className="mt-4 block">
              {t.vehicles.statusColumn}
              <select
                className="ml-3 rounded border bg-white p-2 dark:bg-slate-900"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">{t.portal.all}</option>
                <option value="open">{t.portal.open}</option>
                <option value="closed">{t.portal.closed}</option>
              </select>
            </label>
            {history.id !== vehicleId || history.loading ? (
              <p role="status" className="mt-4">
                {t.portal.loading}
              </p>
            ) : history.error ? (
              <p role="alert" className="mt-4 text-red-600">
                {history.error}
              </p>
            ) : (
              <>
                {rows.length === 0 ? (
                  <p className="mt-4">{t.vehicles.noWorkOrders}</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {rows.slice((page - 1) * 10, page * 10).map((order) => (
                      <li key={order.id}>
                        <Link
                          className="block rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                          href={`/myvehicles/${vehicleId}/services/${order.id}`}
                        >
                          <strong>WO-{String(order.id).padStart(6, "0")}</strong>
                          <p>{order.reportedProblem}</p>
                          <p className="mt-1 text-sm">
                            {order.exitDate ? t.portal.closed : t.portal.open}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="disabled:opacity-40"
                  >
                    {t.portal.previous}
                  </button>
                  <span>
                    {page} / {pages}
                  </span>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((value) => value + 1)}
                    className="disabled:opacity-40"
                  >
                    {t.portal.next}
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
