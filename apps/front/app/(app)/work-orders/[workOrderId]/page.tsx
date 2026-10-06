"use client";

import type {
  CreateWorkOrderItemRequest,
  CreateWorkOrderRecommendationRequest,
  CreateWorkOrderRequest,
  CustomerResponse,
  VehicleResponse,
  WorkOrderItemCategory,
  WorkOrderRecommendationPriority,
  WorkOrderRecommendationStatus,
  WorkOrderResponse,
} from "@cardoc/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n/use-i18n";
import { getCustomerName, listCustomers } from "../../customers/customer-api";
import {
  deleteWorkOrder,
  getVehicle,
  getWorkOrder,
  updateWorkOrder,
} from "../../vehicles/vehicle-api";

type ItemForm = {
  category: WorkOrderItemCategory;
  description: string;
  quantity: string;
  unitPrice: string;
};

type RecommendationForm = {
  description: string;
  priority: WorkOrderRecommendationPriority | null;
  status: WorkOrderRecommendationStatus;
};

type WorkOrderForm = {
  diagnosis: string;
  entryDate: string;
  exitDate: string;
  intakeOdometer: string;
  items: ItemForm[];
  notes: string;
  recommendations: RecommendationForm[];
  reportedProblem: string;
};

const newItem = (): ItemForm => ({
  category: "other",
  description: "",
  quantity: "1",
  unitPrice: "0",
});

const newRecommendation = (): RecommendationForm => ({
  description: "",
  priority: null,
  status: "PENDING",
});

export default function WorkOrderDetailPage() {
  const params = useParams<{ workOrderId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [workOrder, setWorkOrder] = useState<WorkOrderResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [form, setForm] = useState<WorkOrderForm | null>(null);
  const [isEditing, setIsEditing] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "edit",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const workOrderId = params.workOrderId;
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
      const workOrderResponse = await getWorkOrder(workOrderId, t.workOrders.loadDetailError);
      const [vehicleResponse, customersResponse] = await Promise.all([
        getVehicle(workOrderResponse.vehicleId.toString(), t.vehicles.loadDetailError),
        listCustomers({ fallbackError: t.vehicles.loadCustomersError, includeArchived: true }),
      ]);

      setWorkOrder(workOrderResponse);
      setVehicle(vehicleResponse);
      setCustomers(customersResponse.data);
      setForm(toForm(workOrderResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.workOrders.loadDetailError);
    } finally {
      setIsLoading(false);
    }
  }, [
    t.vehicles.loadCustomersError,
    t.vehicles.loadDetailError,
    t.workOrders.loadDetailError,
    workOrderId,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadDetail());
  }, [loadDetail]);

  const validateForm = () => {
    if (!form) {
      return t.workOrders.loadDetailError;
    }

    if (!form.reportedProblem.trim()) {
      return t.workOrders.problemRequiredError;
    }

    if (form.items.length === 0) {
      return t.workOrders.noItemsError;
    }

    if (
      form.items.some(
        (item) =>
          !item.description.trim() ||
          Number(item.quantity) <= 0 ||
          Number.isNaN(Number(item.quantity)) ||
          Number(item.unitPrice) < 0 ||
          Number.isNaN(Number(item.unitPrice)),
      )
    ) {
      return t.workOrders.itemRequiredError;
    }

    if (form.recommendations.some((recommendation) => !recommendation.description.trim())) {
      return t.workOrders.recommendationRequiredError;
    }

    if (form.exitDate && new Date(form.exitDate) < new Date(form.entryDate)) {
      return t.workOrders.exitDateError;
    }

    return null;
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workOrder || !vehicle || !form || isSubmitting) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: CreateWorkOrderRequest = {
      diagnosis: toOptionalText(form.diagnosis),
      entryDate: form.entryDate,
      exitDate: form.exitDate ? form.exitDate : null,
      intakeOdometer: toOptionalNumber(form.intakeOdometer),
      items: form.items.map<CreateWorkOrderItemRequest>((item) => ({
        category: item.category,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      notes: toOptionalText(form.notes),
      recommendations: form.recommendations.map<CreateWorkOrderRecommendationRequest>(
        (recommendation) => ({
          description: recommendation.description.trim(),
          priority: recommendation.priority,
          status: recommendation.status,
        }),
      ),
      reportedProblem: form.reportedProblem.trim(),
      vehicleId: vehicle.id,
    };

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedWorkOrder = await updateWorkOrder(
        vehicle.id,
        workOrder.id,
        payload,
        t.workOrders.updateError,
      );
      setWorkOrder(updatedWorkOrder);
      setForm(toForm(updatedWorkOrder));
      setIsEditing(false);
      router.replace(`/work-orders/${workOrder.id}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t.workOrders.updateError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!workOrder) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteWorkOrder(workOrder.id, t.workOrders.deleteError);
      router.push("/work-orders");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.workOrders.deleteError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PanelMessage message={t.workOrders.loading} />;
  }

  if (!workOrder || !vehicle || !form) {
    return (
      <div className="max-w-5xl">
        <BackLink />
        <PanelMessage className="mt-6" message={error ?? t.workOrders.notFound} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <BackLink />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {t.workOrders.sectionLabel}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {formatWorkOrderNumber(workOrder.id)}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonClasses} href={`/vehicles/${vehicle.id}`}>
              {t.workOrders.vehicleDetailAction}
            </Link>
            <button
              className={secondaryButtonClasses}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              {t.workOrders.editAction}
            </button>
            <button
              className={dangerButtonClasses}
              onClick={() => setIsDeleteOpen(true)}
              type="button"
            >
              {t.workOrders.deleteAction}
            </button>
          </div>
        </div>

        {error ? <ErrorMessage message={error} /> : null}

        {isEditing ? (
          <WorkOrderFormView
            form={form}
            isSubmitting={isSubmitting}
            onCancel={() => {
              setForm(toForm(workOrder));
              setIsEditing(false);
              setError(null);
            }}
            onChange={setForm}
            onSubmit={handleSubmit}
          />
        ) : (
          <WorkOrderReadView customerName={customerName} vehicle={vehicle} workOrder={workOrder} />
        )}
      </div>

      {isDeleteOpen ? (
        <ConfirmDialog
          confirmLabel={t.workOrders.deleteConfirm}
          isSubmitting={isSubmitting}
          message={t.workOrders.deleteMessage(formatWorkOrderNumber(workOrder.id))}
          onCancel={() => setIsDeleteOpen(false)}
          onConfirm={confirmDelete}
          title={t.workOrders.deleteTitle}
        />
      ) : null}
    </div>
  );
}

function WorkOrderReadView({
  customerName,
  vehicle,
  workOrder,
}: {
  customerName: string;
  vehicle: VehicleResponse;
  workOrder: WorkOrderResponse;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-8 space-y-8">
      <section className="grid grid-cols-2 gap-5 sm:hidden">
        <DetailField
          className="min-w-0 break-words"
          label={t.workOrders.customerInfoLabel}
          value={customerName}
        />
        <DetailField
          className="min-w-0 break-words"
          label={t.vehicles.licensePlateLabel}
          value={vehicle.licensePlate}
        />
        <DetailField
          className="min-w-0 break-words"
          label={t.workOrders.entryDateLabel}
          value={formatDate(workOrder.entryDate)}
        />
        <DetailField
          className="min-w-0 break-words"
          label={t.workOrders.exitDateLabel}
          value={workOrder.exitDate ? formatDate(workOrder.exitDate) : null}
        />
        <DetailField
          className="min-w-0 break-words"
          label={t.workOrders.reportedProblemLabel}
          value={workOrder.reportedProblem}
        />
        <DetailField
          className="min-w-0 break-words"
          label={t.vehicles.odometerLabel}
          value={workOrder.intakeOdometer?.toString() ?? null}
        />
      </section>

      <section className="hidden gap-5 sm:grid sm:grid-cols-2">
        <DetailField label={t.workOrders.customerInfoLabel} value={customerName} />
        <DetailField label={t.vehicles.licensePlateLabel} value={vehicle.licensePlate} />
        <DetailField label={t.workOrders.entryDateLabel} value={formatDate(workOrder.entryDate)} />
        <DetailField
          label={t.workOrders.exitDateLabel}
          value={workOrder.exitDate ? formatDate(workOrder.exitDate) : null}
        />
        <DetailField label={t.workOrders.reportedProblemLabel} value={workOrder.reportedProblem} />
        <DetailField
          label={t.vehicles.initialOdometerLabel}
          value={workOrder.intakeOdometer?.toString() ?? null}
        />
        <DetailField label={t.workOrders.notesLabel} value={workOrder.notes} />
        <DetailField label={t.workOrders.diagnosisLabel} value={workOrder.diagnosis} />
      </section>

      <section>
        <h3 className="text-base font-semibold">{t.workOrders.itemsTitle}</h3>
        <div className="mt-4 grid gap-2 sm:hidden">
          {workOrder.items.map((item) => (
            <article
              className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              key={item.id}
            >
              <p className="min-w-0 flex-1 basis-40 break-words text-sm font-medium text-slate-700 dark:text-slate-200">
                {item.description}
              </p>
              <p className="whitespace-nowrap text-sm font-semibold text-slate-950 dark:text-slate-50">
                {formatMoney(item.quantity * item.unitPrice)}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 sm:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t.workOrders.descriptionLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.categoryLabel}</th>
                <th className="w-24 px-4 py-3">{t.workOrders.quantityLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.unitPriceLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.totalColumn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {workOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-3">{formatMoney(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold">{t.workOrders.recommendationsTitle}</h3>
        {workOrder.recommendations.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {workOrder.recommendations.map((recommendation) => (
              <article
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                key={recommendation.id}
              >
                <p className="text-sm font-semibold">{recommendation.description}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {recommendation.status ?? "-"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.workOrders.noRecommendations}
          </p>
        )}
      </section>
    </div>
  );
}

function WorkOrderFormView({
  form,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: WorkOrderForm;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (form: WorkOrderForm) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
  const { t } = useI18n();

  const setItem = (index: number, nextItem: ItemForm) => {
    onChange({
      ...form,
      items: form.items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
    });
  };

  const setRecommendation = (index: number, nextRecommendation: RecommendationForm) => {
    onChange({
      ...form,
      recommendations: form.recommendations.map((recommendation, recommendationIndex) =>
        recommendationIndex === index ? nextRecommendation : recommendation,
      ),
    });
  };

  return (
    <form className="mt-8 space-y-8" onSubmit={onSubmit}>
      <section className="grid gap-5 sm:grid-cols-2">
        <Field label={t.workOrders.reportedProblemLabel} required>
          <input
            className={inputClasses}
            onChange={(event) => onChange({ ...form, reportedProblem: event.target.value })}
            required
            value={form.reportedProblem}
          />
        </Field>
        <Field label={t.vehicles.initialOdometerLabel}>
          <input
            className={inputClasses}
            min="0"
            onChange={(event) => onChange({ ...form, intakeOdometer: event.target.value })}
            type="number"
            value={form.intakeOdometer}
          />
        </Field>
        <Field label={t.workOrders.entryDateLabel} required>
          <input
            className={inputClasses}
            onChange={(event) => onChange({ ...form, entryDate: event.target.value })}
            required
            type="date"
            value={form.entryDate}
          />
        </Field>
        <Field label={t.workOrders.exitDateLabel}>
          <input
            className={inputClasses}
            min={form.entryDate}
            onChange={(event) => onChange({ ...form, exitDate: event.target.value })}
            type="date"
            value={form.exitDate}
          />
        </Field>
        <Field label={t.workOrders.notesLabel}>
          <textarea
            className={`${inputClasses} min-h-24 py-3`}
            onChange={(event) => onChange({ ...form, notes: event.target.value })}
            value={form.notes}
          />
        </Field>
        <Field label={t.workOrders.diagnosisLabel}>
          <textarea
            className={`${inputClasses} min-h-24 py-3`}
            onChange={(event) => onChange({ ...form, diagnosis: event.target.value })}
            value={form.diagnosis}
          />
        </Field>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{t.workOrders.itemsTitle}</h3>
          <button
            className={secondaryButtonClasses}
            onClick={() => onChange({ ...form, items: [...form.items, newItem()] })}
            type="button"
          >
            {t.workOrders.addItem}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {form.items.map((item, index) => (
            <div
              className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-[1fr_150px_120px_150px_auto]"
              key={index}
            >
              <Field label={t.workOrders.descriptionLabel} required>
                <input
                  className={inputClasses}
                  onChange={(event) => setItem(index, { ...item, description: event.target.value })}
                  required
                  value={item.description}
                />
              </Field>
              <Field label={t.workOrders.categoryLabel}>
                <select
                  className={inputClasses}
                  onChange={(event) =>
                    setItem(index, {
                      ...item,
                      category: event.target.value as WorkOrderItemCategory,
                    })
                  }
                  value={item.category}
                >
                  <option value="labor">{t.workOrders.laborCategory}</option>
                  <option value="part">{t.workOrders.partCategory}</option>
                  <option value="other">{t.workOrders.otherCategory}</option>
                </select>
              </Field>
              <Field label={t.workOrders.quantityLabel} required>
                <input
                  className={inputClasses}
                  min="0.01"
                  onChange={(event) => setItem(index, { ...item, quantity: event.target.value })}
                  required
                  step="0.01"
                  type="number"
                  value={item.quantity}
                />
              </Field>
              <Field label={t.workOrders.unitPriceLabel} required>
                <input
                  className={inputClasses}
                  min="0"
                  onChange={(event) => setItem(index, { ...item, unitPrice: event.target.value })}
                  required
                  step="0.01"
                  type="number"
                  value={item.unitPrice}
                />
              </Field>
              <button
                className={`${secondaryButtonClasses} self-end`}
                disabled={form.items.length === 1}
                onClick={() =>
                  onChange({
                    ...form,
                    items: form.items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                type="button"
              >
                {t.workOrders.removeAction}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{t.workOrders.recommendationsTitle}</h3>
          <button
            className={secondaryButtonClasses}
            onClick={() =>
              onChange({ ...form, recommendations: [...form.recommendations, newRecommendation()] })
            }
            type="button"
          >
            {t.workOrders.addRecommendation}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {form.recommendations.map((recommendation, index) => (
            <div
              className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-[1fr_180px_auto]"
              key={index}
            >
              <Field label={t.workOrders.descriptionLabel} required>
                <input
                  className={inputClasses}
                  onChange={(event) =>
                    setRecommendation(index, {
                      ...recommendation,
                      description: event.target.value,
                    })
                  }
                  required
                  value={recommendation.description}
                />
              </Field>
              <Field label={t.workOrders.statusLabel}>
                <select
                  className={inputClasses}
                  onChange={(event) =>
                    setRecommendation(index, {
                      ...recommendation,
                      status: event.target.value as WorkOrderRecommendationStatus,
                    })
                  }
                  value={recommendation.status}
                >
                  <option value="REJECTED">{t.workOrders.rejectedRecommendation}</option>
                  <option value="PENDING">{t.workOrders.pendingRecommendation}</option>
                  <option value="ACCEPTED">{t.workOrders.acceptedRecommendation}</option>
                </select>
              </Field>
              <button
                className={`${secondaryButtonClasses} self-end`}
                onClick={() =>
                  onChange({
                    ...form,
                    recommendations: form.recommendations.filter(
                      (_, recommendationIndex) => recommendationIndex !== index,
                    ),
                  })
                }
                type="button"
              >
                {t.workOrders.removeAction}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className={secondaryButtonClasses}
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          {t.workOrders.cancel}
        </button>
        <button className={primaryButtonClasses} disabled={isSubmitting} type="submit">
          {isSubmitting ? t.workOrders.saving : t.workOrders.save}
        </button>
      </div>
    </form>
  );
}

const toForm = (workOrder: WorkOrderResponse): WorkOrderForm => ({
  diagnosis: workOrder.diagnosis ?? "",
  entryDate: toDateInput(new Date(workOrder.entryDate)),
  exitDate: workOrder.exitDate ? toDateInput(new Date(workOrder.exitDate)) : "",
  intakeOdometer: workOrder.intakeOdometer?.toString() ?? "",
  items: workOrder.items.map((item) => ({
    category: item.category,
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
  })),
  notes: workOrder.notes ?? "",
  recommendations: workOrder.recommendations.map((recommendation) => ({
    description: recommendation.description,
    priority: recommendation.priority,
    status: recommendation.status ?? "PENDING",
  })),
  reportedProblem: workOrder.reportedProblem,
});

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toOptionalText = (value: string) => {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
};

const toOptionalNumber = (value: string) => {
  const trimmed = value.trim();

  return trimmed ? Number(trimmed) : null;
};

const formatWorkOrderNumber = (id: number) => `WO-${id.toString().padStart(6, "0")}`;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", { currency: "ARS", style: "currency" }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";
const primaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
const dangerButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60";

function DetailField({
  className = "",
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

function BackLink() {
  const { t } = useI18n();

  return (
    <Link
      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      href="/work-orders"
    >
      <span aria-hidden="true">{"<-"}</span>
      {t.workOrders.backToWorkOrders}
    </Link>
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
            className={secondaryButtonClasses}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t.workOrders.cancel}
          </button>
          <button
            className={dangerButtonClasses}
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
