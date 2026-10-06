"use client";

import type { VehicleResponse, WorkOrderResponse } from "@cardoc/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import { deleteWorkOrder, listVehicles, listWorkOrdersByVehicle } from "../vehicles/vehicle-api";

type PendingWorkOrder = {
  vehicle: VehicleResponse;
  workOrder: WorkOrderResponse;
};

export default function WorkOrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<PendingWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingWorkOrder | null>(null);
  const [showFinishedWorkOrders, setShowFinishedWorkOrders] = useState(false);

  const loadOrders = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const vehiclesResponse = await listVehicles({
        fallbackError: t.vehicles.loadError,
        pageSize: 100,
      });
      const ordersByVehicle = await Promise.all(
        vehiclesResponse.data
          .filter((vehicle) => vehicle.isActive)
          .map(async (vehicle) => {
            const workOrdersResponse = await listWorkOrdersByVehicle({
              fallbackError: t.workOrders.loadError,
              page: 1,
              pageSize: 100,
              vehicleId: vehicle.id,
              withEndDate: showFinishedWorkOrders,
            });

            const filteredWorkOrders = showFinishedWorkOrders
              ? workOrdersResponse.data
              : workOrdersResponse.data.filter((workOrder) => workOrder.exitDate === null);

            return filteredWorkOrders.map((workOrder) => ({ vehicle, workOrder }));
          }),
      );

      setOrders(ordersByVehicle.flat());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.workOrders.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [showFinishedWorkOrders, t.vehicles.loadError, t.workOrders.loadError]);

  useEffect(() => {
    queueMicrotask(() => void loadOrders());
  }, [loadOrders]);

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteWorkOrder(pendingDelete.workOrder.id, t.workOrders.deleteError);
      setPendingDelete(null);
      await loadOrders();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.workOrders.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderedWorkOrders = useMemo(
    () =>
      [...orders].sort(
        (firstOrder, secondOrder) =>
          new Date(secondOrder.workOrder.entryDate).getTime() -
            new Date(firstOrder.workOrder.entryDate).getTime() ||
          secondOrder.workOrder.id - firstOrder.workOrder.id,
      ),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {t.workOrders.sectionLabel}
        </p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {showFinishedWorkOrders ? t.workOrders.doneTitle : t.workOrders.pendingTitle}
          </h2>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input
              checked={showFinishedWorkOrders}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950"
              onChange={(event) => setShowFinishedWorkOrders(event.target.checked)}
              type="checkbox"
            />
            {t.workOrders.finishedFilter}
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        {error ? <ErrorMessage message={error} /> : null}

        <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 md:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t.workOrders.orderColumn}</th>
                <th className="px-4 py-3">{t.workOrders.vehicleColumn}</th>
                <th className="px-4 py-3">{t.workOrders.entryDateColumn}</th>
                {showFinishedWorkOrders ? (
                  <th className="px-4 py-3">{t.workOrders.exitDateColumn}</th>
                ) : null}
                <th className="w-36 px-4 py-3">{t.workOrders.totalColumn}</th>
                <th className="w-36 px-4 py-3 text-right">{t.workOrders.actionsColumn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {orderedWorkOrders.map(({ vehicle, workOrder }) => (
                <tr key={workOrder.id}>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      className="text-blue-700 hover:text-blue-800 dark:text-blue-300"
                      href={`/work-orders/${workOrder.id}`}
                    >
                      {formatWorkOrderNumber(workOrder.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
                      href={`/vehicles/${vehicle.id}`}
                    >
                      {vehicle.licensePlate}
                    </Link>
                    <span className="block truncate text-slate-500 dark:text-slate-400">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(workOrder.entryDate)}</td>
                  {showFinishedWorkOrders ? (
                    <td className="px-4 py-3">
                      {workOrder.exitDate ? formatDate(workOrder.exitDate) : "-"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">{formatMoney(getWorkOrderTotal(workOrder))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <ActionLink
                        href={`/work-orders/${workOrder.id}`}
                        label={t.workOrders.viewAction}
                      >
                        <EyeIcon />
                      </ActionLink>
                      <ActionLink
                        href={`/work-orders/${workOrder.id}?mode=edit`}
                        label={t.workOrders.editAction}
                      >
                        <EditIcon />
                      </ActionLink>
                      <ActionButton
                        label={t.workOrders.deleteAction}
                        onClick={() => setPendingDelete({ vehicle, workOrder })}
                        tone="danger"
                      >
                        <TrashIcon />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {orderedWorkOrders.map(({ vehicle, workOrder }) => (
            <article
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              key={workOrder.id}
            >
              <Link
                className="text-sm font-semibold text-blue-700 dark:text-blue-300"
                href={`/work-orders/${workOrder.id}`}
              >
                {formatWorkOrderNumber(workOrder.id)}
              </Link>
              <Link
                className="mt-2 block text-sm font-semibold text-blue-700 dark:text-blue-300"
                href={`/vehicles/${vehicle.id}`}
              >
                {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
              </Link>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {formatDate(workOrder.entryDate)}
              </p>
              {showFinishedWorkOrders ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t.workOrders.exitDateColumn}:{" "}
                  {workOrder.exitDate ? formatDate(workOrder.exitDate) : "-"}
                </p>
              ) : null}
              <p className="mt-2 text-sm font-semibold">
                {formatMoney(getWorkOrderTotal(workOrder))}
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <ActionLink href={`/work-orders/${workOrder.id}`} label={t.workOrders.viewAction}>
                  <EyeIcon />
                </ActionLink>
                <ActionLink
                  href={`/work-orders/${workOrder.id}?mode=edit`}
                  label={t.workOrders.editAction}
                >
                  <EditIcon />
                </ActionLink>
                <ActionButton
                  label={t.workOrders.deleteAction}
                  onClick={() => setPendingDelete({ vehicle, workOrder })}
                  tone="danger"
                >
                  <TrashIcon />
                </ActionButton>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && orderedWorkOrders.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {showFinishedWorkOrders ? t.workOrders.emptyDone : t.workOrders.emptyPending}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.workOrders.loading}
          </p>
        ) : null}
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          confirmLabel={t.workOrders.deleteConfirm}
          isSubmitting={isSubmitting}
          message={t.workOrders.deleteMessage(formatWorkOrderNumber(pendingDelete.workOrder.id))}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
          title={t.workOrders.deleteTitle}
        />
      ) : null}
    </div>
  );
}

const getWorkOrderTotal = (workOrder: WorkOrderResponse) =>
  workOrder.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);

const formatWorkOrderNumber = (id: number) => `WO-${id.toString().padStart(6, "0")}`;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", { currency: "ARS", style: "currency" }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(value),
  );

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}

const secondaryButtonClasses =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white";
const dangerButtonClasses =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60 dark:hover:bg-red-950/40";
const dialogSecondaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
const dialogDangerButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60";

function ActionLink({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link aria-label={label} className={secondaryButtonClasses} href={href} title={label}>
      {children}
    </Link>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger" | "default";
}) {
  return (
    <button
      aria-label={label}
      className={tone === "danger" ? dangerButtonClasses : secondaryButtonClasses}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m14.5 6.5 3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ConfirmDialog({
  confirmLabel,
  isSubmitting,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  isSubmitting: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className={dialogSecondaryButtonClasses}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t.workOrders.cancel}
          </button>
          <button
            className={dialogDangerButtonClasses}
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
