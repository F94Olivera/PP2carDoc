"use client";

import type {
  CreateVehicleRequest,
  CustomerResponse,
  PaginationMeta,
  VehicleResponse,
  WorkOrderResponse,
} from "@cardoc/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n/use-i18n";
import { getCustomerName, listCustomers } from "../../customers/customer-api";
import {
  archiveVehicle,
  deleteVehicle,
  getVehicle,
  listWorkOrdersByVehicle,
  updateVehicle,
} from "../vehicle-api";

const workOrdersPageSize = 5;

type VehicleForm = {
  customerId: string;
  initialOdometer: string;
  licensePlate: string;
  make: string;
  model: string;
  odometerUnit: "km" | "mi";
  year: string;
};

export default function VehicleDetailPage() {
  const params = useParams<{ vehicleId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([]);
  const [workOrdersMeta, setWorkOrdersMeta] = useState<PaginationMeta | null>(null);
  const [workOrdersPage, setWorkOrdersPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<VehicleForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"archive" | "delete" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehicleId = params.vehicleId;
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const customerName = vehicle
    ? getCustomerName(
        customerById.get(vehicle.customerId) ?? {
          firstName: t.vehicles.unknownCustomer,
          lastName: null,
        },
      )
    : "-";

  const loadDetail = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [vehicleResponse, customersResponse] = await Promise.all([
        getVehicle(vehicleId, t.vehicles.loadDetailError),
        listCustomers({ fallbackError: t.vehicles.loadCustomersError, includeArchived: true }),
      ]);
      setVehicle(vehicleResponse);
      setCustomers(customersResponse.data);
      setForm(toForm(vehicleResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.vehicles.loadDetailError);
    } finally {
      setIsLoading(false);
    }
  }, [t.vehicles.loadCustomersError, t.vehicles.loadDetailError, vehicleId]);

  const loadWorkOrders = useCallback(async () => {
    if (!vehicle) {
      return;
    }

    try {
      const response = await listWorkOrdersByVehicle({
        fallbackError: t.vehicles.loadWorkOrdersError,
        page: workOrdersPage,
        pageSize: workOrdersPageSize,
        vehicleId: vehicle.id,
      });

      if (response.meta.totalPages > 0 && workOrdersPage > response.meta.totalPages) {
        setWorkOrdersPage(response.meta.totalPages);
        return;
      }

      setWorkOrders(response.data);
      setWorkOrdersMeta(response.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.vehicles.loadWorkOrdersError);
    }
  }, [t.vehicles.loadWorkOrdersError, vehicle, workOrdersPage]);

  useEffect(() => {
    queueMicrotask(() => void loadDetail());
  }, [loadDetail]);

  useEffect(() => {
    queueMicrotask(() => void loadWorkOrders());
  }, [loadWorkOrders]);

  const updateField = (field: keyof VehicleForm, value: string) => {
    setForm((currentForm) => (currentForm ? { ...currentForm, [field]: value } : currentForm));
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!vehicle || !form) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateVehicleRequest = {
      customerId: Number(form.customerId),
      initialOdometer: toOptionalNumber(form.initialOdometer),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      make: form.make.trim(),
      model: form.model.trim(),
      odometerUnit: form.odometerUnit,
      year: toOptionalNumber(form.year),
    };

    try {
      const updatedVehicle = await updateVehicle(vehicle.id, payload, t.vehicles.updateError);
      setVehicle(updatedVehicle);
      setForm(toForm(updatedVehicle));
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t.vehicles.updateError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmAction = async () => {
    if (!vehicle || !confirmMode) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (confirmMode === "delete") {
        await deleteVehicle(vehicle.id, t.vehicles.deleteError);
        router.push("/vehicles");
        return;
      }

      const updatedVehicle = await archiveVehicle(vehicle.id, false, t.vehicles.archiveError);
      setVehicle(updatedVehicle);
      setForm(toForm(updatedVehicle));
      setConfirmMode(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.vehicles.actionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PanelMessage message={t.vehicles.loadingDetail} />;
  }

  if (!vehicle) {
    return (
      <div className="max-w-4xl">
        <BackLink label={t.vehicles.back} />
        <PanelMessage className="mt-6" message={error ?? t.vehicles.notFound} />
      </div>
    );
  }

  const currentWorkOrdersPage = workOrdersMeta?.page ?? workOrdersPage;

  return (
    <div className="max-w-5xl">
      <BackLink label={t.vehicles.back} />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{t.vehicles.detailTitle}</h2>
              {!vehicle.isActive ? <StatusBadge label={t.vehicles.archivedStatus} /> : null}
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vehicle.isActive ? (
              <Link
                className={primaryButtonClasses}
                href={`/vehicles/${vehicle.id}/work-orders/new`}
              >
                {t.vehicles.newWorkOrderAction}
              </Link>
            ) : null}
            <button
              className={secondaryButtonClasses}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              {t.vehicles.editAction}
            </button>
            {vehicle.isActive ? (
              <button
                className={secondaryButtonClasses}
                onClick={() => setConfirmMode("archive")}
                type="button"
              >
                {t.vehicles.archiveAction}
              </button>
            ) : null}
            <button
              className={dangerButtonClasses}
              onClick={() => setConfirmMode("delete")}
              type="button"
            >
              {t.vehicles.deleteAction}
            </button>
          </div>
        </div>

        {error ? <ErrorMessage message={error} /> : null}

        {isEditing && form ? (
          <form
            className="mt-8 grid gap-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <Field label={t.vehicles.customerLabel} required>
              <select
                className={inputClasses}
                onChange={(event) => updateField("customerId", event.target.value)}
                required
                value={form.customerId}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {getCustomerName(customer)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.vehicles.licensePlateLabel} required>
              <input
                className={inputClasses}
                onChange={(event) => updateField("licensePlate", event.target.value)}
                required
                value={form.licensePlate}
              />
            </Field>
            <Field label={t.vehicles.makeLabel} required>
              <input
                className={inputClasses}
                onChange={(event) => updateField("make", event.target.value)}
                required
                value={form.make}
              />
            </Field>
            <Field label={t.vehicles.modelLabel} required>
              <input
                className={inputClasses}
                onChange={(event) => updateField("model", event.target.value)}
                required
                value={form.model}
              />
            </Field>
            <Field label={t.vehicles.yearLabel}>
              <input
                className={inputClasses}
                min={1886}
                onChange={(event) => updateField("year", event.target.value)}
                type="number"
                value={form.year}
              />
            </Field>
            <Field label={t.vehicles.initialOdometerLabel}>
              <input
                className={inputClasses}
                min={0}
                onChange={(event) => updateField("initialOdometer", event.target.value)}
                type="number"
                value={form.initialOdometer}
              />
            </Field>
            <Field label={t.vehicles.odometerUnitLabel}>
              <select
                className={inputClasses}
                onChange={(event) => updateField("odometerUnit", event.target.value)}
                value={form.odometerUnit}
              >
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </Field>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <button
                className={secondaryButtonClasses}
                onClick={() => {
                  setForm(toForm(vehicle));
                  setIsEditing(false);
                }}
                type="button"
              >
                {t.vehicles.cancel}
              </button>
              <button className={primaryButtonClasses} disabled={isSubmitting} type="submit">
                {isSubmitting ? t.vehicles.saving : t.vehicles.save}
              </button>
            </div>
          </form>
        ) : (
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
        )}

        <section className="mt-10">
          <h3 className="text-lg font-semibold">
            {t.vehicles.workOrdersTitle(workOrdersMeta?.total ?? workOrders.length)}
          </h3>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="hidden w-full table-fixed text-left text-sm md:table">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t.vehicles.dateColumn}</th>
                  <th className="px-4 py-3">{t.vehicles.problemColumn}</th>
                  <th className="w-32 px-4 py-3">{t.vehicles.statusColumn}</th>
                  <th className="w-32 px-4 py-3">{t.vehicles.totalColumn}</th>
                  <th className="w-28 px-4 py-3 text-right">{t.vehicles.actionsColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {workOrders.map((workOrder) => (
                  <tr key={workOrder.id}>
                    <td className="px-4 py-3">{formatDate(workOrder.entryDate)}</td>
                    <td className="truncate px-4 py-3">{workOrder.reportedProblem}</td>
                    <td className="px-4 py-3">
                      {workOrder.exitDate ? t.vehicles.finishedStatus : t.vehicles.pendingStatus}
                    </td>
                    <td className="px-4 py-3">{formatMoney(getWorkOrderTotal(workOrder))}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                        href={`/work-orders/${workOrder.id}`}
                      >
                        {t.workOrders.viewAction}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 md:hidden">
              {workOrders.map((workOrder) => (
                <article className="p-4" key={workOrder.id}>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {formatDate(workOrder.entryDate)}
                  </p>
                  <p className="mt-2 text-sm">{workOrder.reportedProblem}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {workOrder.exitDate ? t.vehicles.finishedStatus : t.vehicles.pendingStatus}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatMoney(getWorkOrderTotal(workOrder))}
                  </p>
                  <Link
                    className="mt-3 inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    href={`/work-orders/${workOrder.id}`}
                  >
                    {t.workOrders.viewAction}
                  </Link>
                </article>
              ))}
            </div>
            {workOrders.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {t.vehicles.noWorkOrders}
              </p>
            ) : null}
          </div>

          {workOrdersMeta && workOrdersMeta.totalPages > 1 ? (
            <Pagination
              hasNextPage={workOrdersMeta.hasNextPage}
              hasPreviousPage={workOrdersMeta.hasPreviousPage}
              page={currentWorkOrdersPage}
              pageCount={workOrdersMeta.totalPages}
              setPage={setWorkOrdersPage}
            />
          ) : null}
        </section>
      </div>

      {confirmMode ? (
        <ConfirmDialog
          confirmLabel={
            confirmMode === "delete" ? t.vehicles.deleteConfirm : t.vehicles.archiveConfirm
          }
          isSubmitting={isSubmitting}
          message={
            confirmMode === "delete"
              ? t.vehicles.deleteMessage(vehicle.licensePlate)
              : t.vehicles.archiveMessage(vehicle.licensePlate)
          }
          onCancel={() => setConfirmMode(null)}
          onConfirm={confirmAction}
          title={confirmMode === "delete" ? t.vehicles.deleteTitle : t.vehicles.archiveTitle}
          tone={confirmMode === "delete" ? "danger" : "default"}
        />
      ) : null}
    </div>
  );
}

const toForm = (vehicle: VehicleResponse): VehicleForm => ({
  customerId: vehicle.customerId.toString(),
  initialOdometer: vehicle.initialOdometer?.toString() ?? "",
  licensePlate: vehicle.licensePlate,
  make: vehicle.make,
  model: vehicle.model,
  odometerUnit: vehicle.odometerUnit,
  year: vehicle.year?.toString() ?? "",
});

const toOptionalNumber = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue ? Number(trimmedValue) : null;
};

const getWorkOrderTotal = (workOrder: WorkOrderResponse) =>
  workOrder.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", { currency: "ARS", style: "currency" }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(value),
  );

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";
const primaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
const dangerButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700";

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

function Field({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      href="/vehicles"
    >
      <span aria-hidden="true">{"<-"}</span>
      {label}
    </Link>
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

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {label}
    </span>
  );
}

function Pagination({
  hasNextPage,
  hasPreviousPage,
  page,
  pageCount,
  setPage,
}: {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}) {
  return (
    <nav className="mt-6 flex justify-center gap-2" aria-label="Pagination">
      <button
        className="h-10 min-w-10 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
        disabled={!hasPreviousPage}
        onClick={() => setPage(page - 1)}
        type="button"
      >
        {"<"}
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
        <button
          className={`h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition ${
            page === pageNumber
              ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
          key={pageNumber}
          onClick={() => setPage(pageNumber)}
          type="button"
        >
          {pageNumber}
        </button>
      ))}
      <button
        className="h-10 min-w-10 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
        disabled={!hasNextPage}
        onClick={() => setPage(page + 1)}
        type="button"
      >
        {">"}
      </button>
    </nav>
  );
}

function PanelMessage({ className, message }: { className?: string; message: string }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 ${className ?? ""}`}
    >
      {message}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
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
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-4 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
          {message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            className={secondaryButtonClasses}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t.vehicles.cancel}
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
