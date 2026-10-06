"use client";

import type { CustomerResponse, VehicleResponse } from "@cardoc/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n/use-i18n";
import {
  archiveCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerName,
  listVehicles,
} from "../customer-api";

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"archive" | "delete" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerId = params.customerId;

  const associatedVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.customerId === customer?.id),
    [customer?.id, vehicles],
  );

  const loadDetail = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [customerResponse, vehiclesResponse] = await Promise.all([
        getCustomer(customerId, t.customers.loadDetailError),
        listVehicles(t.customers.loadVehiclesError, true),
      ]);
      setCustomer(customerResponse);
      setVehicles(vehiclesResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.customers.loadDetailError);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, t.customers.loadDetailError, t.customers.loadVehiclesError]);

  useEffect(() => {
    queueMicrotask(() => void loadDetail());
  }, [loadDetail]);

  const confirmAction = async () => {
    if (!customer || !confirmMode) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (confirmMode === "delete") {
        await deleteCustomer(customer.id, t.customers.deleteError);
        router.push("/customers");
        return;
      }

      const updatedCustomer = await archiveCustomer(customer.id, false, t.customers.archiveError);
      setCustomer(updatedCustomer);
      setConfirmMode(null);
      await loadDetail();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.customers.actionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {t.customers.loadingDetail}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-3xl">
        <BackLink label={t.customers.back} />
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {error ?? t.customers.notFound}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <BackLink label={t.customers.back} />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{t.customers.detailTitle}</h2>
              {!customer.isActive ? <StatusBadge label={t.customers.archivedStatus} /> : null}
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {getCustomerName(customer)}
            </p>
          </div>
          <div className="flex gap-2">
            {customer.isActive ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setConfirmMode("archive")}
                type="button"
              >
                {t.customers.archiveAction}
              </button>
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
              onClick={() => setConfirmMode("delete")}
              type="button"
            >
              {t.customers.deleteAction}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <dl className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-2">
          <DetailField label={t.customers.firstNameLabel} value={customer.firstName} />
          <DetailField label={t.customers.lastNameLabel} value={customer.lastName} />
          <DetailField label={t.customers.emailLabel} value={customer.email} />
          <DetailField label={t.customers.phoneLabel} value={customer.phone} />
          <DetailField label={t.customers.documentLabel} value={customer.documentNumber} />
          <DetailField label={t.customers.addressLabel} value={customer.address} />
          <DetailField
            className="col-span-2 sm:col-span-2"
            label={t.customers.notesLabel}
            value={customer.notes}
          />
        </dl>

        <section className="mt-9">
          <h3 className="text-lg font-semibold">{t.customers.associatedVehicles}</h3>
          {associatedVehicles.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {associatedVehicles.map((vehicle) => (
                <Link
                  aria-label={`${t.vehicles.viewAction}: ${vehicle.licensePlate}`}
                  className="group rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-blue-950/20 dark:focus-visible:ring-offset-slate-900"
                  href={`/vehicles/${vehicle.id}`}
                  key={vehicle.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">
                        {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {vehicle.licensePlate}
                      </p>
                    </div>
                    {!vehicle.isActive ? <StatusBadge label={t.customers.archivedStatus} /> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {vehicle.year ?? "-"} · {vehicle.initialOdometer ?? "-"} {vehicle.odometerUnit}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:text-blue-800 dark:text-blue-300 dark:group-hover:text-blue-200">
                    {t.vehicles.viewAction}
                    <span aria-hidden="true">{"->"}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t.customers.noVehicles}
            </p>
          )}
        </section>
      </div>

      {confirmMode ? (
        <ConfirmDialog
          confirmLabel={
            confirmMode === "delete" ? t.customers.deleteConfirm : t.customers.archiveConfirm
          }
          isSubmitting={isSubmitting}
          message={
            confirmMode === "delete"
              ? t.customers.deleteMessage(getCustomerName(customer))
              : t.customers.archiveMessage(getCustomerName(customer))
          }
          onCancel={() => setConfirmMode(null)}
          onConfirm={confirmAction}
          title={confirmMode === "delete" ? t.customers.deleteTitle : t.customers.archiveTitle}
          tone={confirmMode === "delete" ? "danger" : "default"}
        />
      ) : null}
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

function BackLink({ label }: { label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      href="/customers"
    >
      <span aria-hidden="true">{"<-"}</span>
      {label}
    </Link>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {label}
    </span>
  );
}

function ConfirmDialog({
  confirmLabel,
  isSubmitting,
  message,
  onCancel,
  onConfirm,
  title,
  tone,
}: {
  confirmLabel: string;
  isSubmitting: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone: "danger" | "default";
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t.customers.cancel}
          </button>
          <button
            className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
