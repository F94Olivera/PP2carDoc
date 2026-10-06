"use client";

import type {
  CreateWorkOrderItemRequest,
  CreateWorkOrderRecommendationRequest,
  CreateWorkOrderRequest,
  CustomerResponse,
  VehicleResponse,
  WorkOrderItemCategory,
  WorkOrderRecommendationStatus,
} from "@cardoc/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../../../i18n/use-i18n";
import { getCustomerName, listCustomers } from "../../../../customers/customer-api";
import { createWorkOrder, getVehicle } from "../../../vehicle-api";

type ItemForm = {
  description: string;
  category: WorkOrderItemCategory;
  quantity: string;
  unitPrice: string;
};

type RecommendationForm = {
  description: string;
  status: WorkOrderRecommendationStatus;
};

type WorkOrderForm = {
  entryDate: string;
  exitDate: string;
  items: ItemForm[];
  recommendations: RecommendationForm[];
};

const newItem = (): ItemForm => ({
  category: "part",
  description: "",
  quantity: "1",
  unitPrice: "0",
});

const newRecommendation = (): RecommendationForm => ({
  description: "",
  status: "REJECTED",
});

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toIsoDateTime = (date: string) => {
  return new Date(`${date}T00:00:00`).toISOString();
};

export default function NewWorkOrderPage() {
  const params = useParams<{ vehicleId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [form, setForm] = useState<WorkOrderForm>({
    entryDate: toDateInput(new Date()),
    exitDate: "",
    items: [newItem()],
    recommendations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadContext = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [vehicleResponse, customersResponse] = await Promise.all([
        getVehicle(params.vehicleId, t.vehicles.loadDetailError),
        listCustomers(t.vehicles.loadCustomersError),
      ]);
      setVehicle(vehicleResponse);
      setCustomers(customersResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.workOrders.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.vehicleId,
    t.vehicles.loadCustomersError,
    t.vehicles.loadDetailError,
    t.workOrders.loadError,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadContext());
  }, [loadContext]);

  const setItem = (index: number, nextItem: ItemForm) => {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
    }));
  };

  const setRecommendation = (index: number, nextRecommendation: RecommendationForm) => {
    setForm((currentForm) => ({
      ...currentForm,
      recommendations: currentForm.recommendations.map((recommendation, recommendationIndex) =>
        recommendationIndex === index ? nextRecommendation : recommendation,
      ),
    }));
  };

  const validateForm = () => {
    if (form.items.length === 0) {
      return t.workOrders.noItemsError;
    }

    const hasInvalidItem = form.items.some(
      (item) =>
        !item.description.trim() ||
        Number(item.quantity) <= 0 ||
        Number.isNaN(Number(item.quantity)) ||
        Number(item.unitPrice) < 0 ||
        Number.isNaN(Number(item.unitPrice)),
    );

    if (hasInvalidItem) {
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

    if (!vehicle || isSubmitting) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: CreateWorkOrderRequest = {
      vehicleId: vehicle.id,
      entryDate: toIsoDateTime(form.entryDate),
      exitDate: form.exitDate ? toIsoDateTime(form.exitDate) : null,
      items: form.items.map<CreateWorkOrderItemRequest>((item) => ({
        category: item.category,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      recommendations: form.recommendations.map<CreateWorkOrderRecommendationRequest>(
        (recommendation) => ({
          description: recommendation.description.trim(),
          status: recommendation.status,
        }),
      ),
    };

    setIsSubmitting(true);
    setError(null);

    try {
      await createWorkOrder(payload, t.workOrders.createError);
      router.push(`/vehicles/${vehicle.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t.workOrders.createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PanelMessage message={t.workOrders.loading} />;
  }

  if (!vehicle) {
    return <PanelMessage message={error ?? t.vehicles.notFound} />;
  }

  return (
    <div className="max-w-5xl">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        href={`/vehicles/${vehicle.id}`}
      >
        <span aria-hidden="true">{"<-"}</span>
        {t.workOrders.backToVehicle}
      </Link>

      <form
        className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {t.workOrders.sectionLabel}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.workOrders.newTitle}</h2>
          </div>
          <button className={primaryButtonClasses} disabled={isSubmitting} type="submit">
            {isSubmitting ? t.workOrders.saving : t.workOrders.save}
          </button>
        </div>

        {error ? <ErrorMessage message={error} /> : null}

        <section className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:gap-x-5">
          <h3 className="col-span-2 text-base font-semibold">{t.workOrders.vehicleSummaryTitle}</h3>
          <DetailField label={t.vehicles.licensePlateLabel} value={vehicle.licensePlate} />
          <DetailField label={t.workOrders.customerInfoLabel} value={customerName} />
          <DetailField label={t.vehicles.makeLabel} value={vehicle.make} />
          <DetailField label={t.vehicles.modelLabel} value={vehicle.model} />
          <DetailField label={t.vehicles.yearLabel} value={vehicle.year?.toString() ?? null} />
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label={t.workOrders.entryDateLabel} required>
            <input
              className={inputClasses}
              onChange={(event) =>
                setForm((currentForm) => ({ ...currentForm, entryDate: event.target.value }))
              }
              required
              type="date"
              value={form.entryDate}
            />
          </Field>
          <Field label={t.workOrders.exitDateLabel}>
            <input
              className={inputClasses}
              min={form.entryDate}
              onChange={(event) =>
                setForm((currentForm) => ({ ...currentForm, exitDate: event.target.value }))
              }
              type="date"
              value={form.exitDate}
            />
          </Field>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{t.workOrders.itemsTitle}</h3>
            <button
              className={secondaryButtonClasses}
              onClick={() =>
                setForm((currentForm) => ({
                  ...currentForm,
                  items: [...currentForm.items, newItem()],
                }))
              }
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
                    onChange={(event) =>
                      setItem(index, { ...item, description: event.target.value })
                    }
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
                    setForm((currentForm) => ({
                      ...currentForm,
                      items: currentForm.items.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  type="button"
                >
                  {t.workOrders.removeAction}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{t.workOrders.recommendationsTitle}</h3>
            <button
              className={secondaryButtonClasses}
              onClick={() =>
                setForm((currentForm) => ({
                  ...currentForm,
                  recommendations: [...currentForm.recommendations, newRecommendation()],
                }))
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
                    setForm((currentForm) => ({
                      ...currentForm,
                      recommendations: currentForm.recommendations.filter(
                        (_, recommendationIndex) => recommendationIndex !== index,
                      ),
                    }))
                  }
                  type="button"
                >
                  {t.workOrders.removeAction}
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link className={secondaryButtonClasses} href={`/vehicles/${vehicle.id}`}>
            {t.workOrders.cancel}
          </Link>
          <button className={primaryButtonClasses} disabled={isSubmitting} type="submit">
            {isSubmitting ? t.workOrders.saving : t.workOrders.save}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";
const primaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}

function PanelMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {message}
    </div>
  );
}
