"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { VehicleResponse } from "@cardoc/types";
import { useI18n } from "../../i18n/use-i18n";
import { listMyVehicles } from "./myvehicle-api";

export default function MyVehiclesPage() {
  const { t } = useI18n();
  const [state, setState] = useState<{
    data: VehicleResponse[];
    loading: boolean;
    error: string | null;
  }>({ data: [], loading: true, error: null });
  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (!active) return;
      setState({ data: [], loading: true, error: null });
      try {
        const result = await listMyVehicles(t.portal.error);
        if (active) setState({ data: result.data, loading: false, error: null });
      } catch (error) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: error instanceof Error ? error.message : t.portal.error,
          });
      }
    });
    return () => {
      active = false;
    };
  }, [t.portal.error]);
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t.portal.title}</h2>
      {state.loading ? (
        <p role="status" className="mt-6">
          {t.portal.loading}
        </p>
      ) : state.error ? (
        <p role="alert" className="mt-6 text-red-600">
          {state.error}
        </p>
      ) : state.data.length === 0 ? (
        <p className="mt-6">{t.portal.empty}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {state.data.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/myvehicles/${vehicle.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="text-lg font-semibold">{vehicle.licensePlate}</h3>
              <p className="mt-2">
                {vehicle.make} {vehicle.model} {vehicle.year ?? ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
