"use client";
import type { VehicleResponse } from "@cardoc/types";
import { useI18n } from "../../i18n/use-i18n";
export function VehicleReadView({
  vehicle,
  customerName,
}: {
  vehicle: VehicleResponse;
  customerName: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_220px]">
      <dl className="grid grid-cols-2 gap-5 md:hidden">
        <DetailField label={t.vehicles.licensePlateLabel} value={vehicle.licensePlate} />
        <DetailField label={t.vehicles.customerLabel} value={customerName} />
        <DetailField label={t.vehicles.makeLabel} value={vehicle.make} />
        <DetailField label={t.vehicles.modelLabel} value={vehicle.model} />
        <DetailField label={t.vehicles.yearLabel} value={vehicle.year?.toString() ?? null} />
        <DetailField
          label={t.vehicles.statusColumn}
          value={vehicle.isActive ? t.vehicles.activeStatus : t.vehicles.archivedStatus}
        />
        <DetailField
          className="col-span-2"
          label={t.vehicles.initialOdometerLabel}
          value={
            vehicle.initialOdometer === null
              ? null
              : `${vehicle.initialOdometer} ${vehicle.odometerUnit}`
          }
        />
      </dl>
      <dl className="hidden gap-5 md:grid sm:grid-cols-2">
        <DetailField label={t.vehicles.licensePlateLabel} value={vehicle.licensePlate} />
        <DetailField label={t.vehicles.customerLabel} value={customerName} />
        <DetailField label={t.vehicles.makeLabel} value={vehicle.make} />
        <DetailField label={t.vehicles.modelLabel} value={vehicle.model} />
        <DetailField label={t.vehicles.yearLabel} value={vehicle.year?.toString() ?? null} />
        <DetailField
          label={t.vehicles.initialOdometerLabel}
          value={
            vehicle.initialOdometer === null
              ? null
              : `${vehicle.initialOdometer} ${vehicle.odometerUnit}`
          }
        />
        <DetailField
          label={t.vehicles.statusColumn}
          value={vehicle.isActive ? t.vehicles.activeStatus : t.vehicles.archivedStatus}
        />
      </dl>
      <VehicleImagePlaceholder />
    </div>
  );
}
function DetailField({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string | null;
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</dt>
      <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">{value ?? "-"}</dd>
    </div>
  );
}

function VehicleImagePlaceholder() {
  return (
    <div className="hidden aspect-[4/3] items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 md:flex">
      <svg aria-hidden="true" className="h-28 w-28" fill="none" viewBox="0 0 24 24">
        <path
          d="M5 12.5 6.8 7h10.4l1.8 5.5M4 12.5h16v5H4v-5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M6.5 17.5v2M17.5 17.5v2M7.5 15h.01M16.5 15h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}
