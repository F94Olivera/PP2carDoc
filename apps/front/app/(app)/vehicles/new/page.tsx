"use client";

import type { CreateVehicleRequest, CustomerResponse } from "@cardoc/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import { useI18n } from "../../../i18n/use-i18n";
import { getCustomerName, listCustomers } from "../../customers/customer-api";
import { createVehicle } from "../vehicle-api";

type VehicleForm = {
  customerId: string;
  initialOdometer: string;
  licensePlate: string;
  make: string;
  model: string;
  odometerUnit: "km" | "mi";
  year: string;
};

const initialForm: VehicleForm = {
  customerId: "",
  initialOdometer: "",
  licensePlate: "",
  make: "",
  model: "",
  odometerUnit: "km",
  year: "",
};

export default function NewVehiclePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isChangingCustomer, setIsChangingCustomer] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCustomer = customers.find((customer) => customer.id.toString() === form.customerId);

  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);

    try {
      const response = await listCustomers(t.vehicles.loadCustomersError);
      setCustomers(response.data.filter((customer) => customer.isActive));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.vehicles.loadCustomersError);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [t.vehicles.loadCustomersError]);

  useEffect(() => {
    queueMicrotask(() => void loadCustomers());
  }, [loadCustomers]);

  useEffect(() => {
    const customerId = new URLSearchParams(window.location.search).get("customerId");

    if (customerId) {
      queueMicrotask(() => {
        setForm((currentForm) => ({ ...currentForm, customerId }));
        setIsChangingCustomer(false);
      });
    }
  }, []);

  const updateField = (field: keyof VehicleForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

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
      const vehicle = await createVehicle(payload, t.vehicles.createError);
      router.push(`/vehicles/${vehicle.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t.vehicles.createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <BackLink label={t.vehicles.back} />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t.vehicles.createTitle}</h2>

        {error ? <ErrorMessage message={error} /> : null}

        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label={t.vehicles.customerLabel} required>
            {selectedCustomer && !isChangingCustomer ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {getCustomerName(selectedCustomer)}
                  </p>
                  <button
                    className="text-left text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    onClick={() => setIsChangingCustomer(true)}
                    type="button"
                  >
                    {t.vehicles.changeCustomer}
                  </button>
                </div>
              </div>
            ) : !isChangingCustomer && isLoadingCustomers ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {t.vehicles.loadingCustomer}
                </p>
              </div>
            ) : (
              <select
                className={inputClasses}
                onChange={(event) => updateField("customerId", event.target.value)}
                required
                value={form.customerId}
              >
                <option value="">{t.vehicles.customerPlaceholder}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {getCustomerName(customer)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t.vehicles.licensePlateLabel} required>
            <input
              className={inputClasses}
              onChange={(event) => updateField("licensePlate", event.target.value)}
              placeholder={t.vehicles.licensePlatePlaceholder}
              required
              value={form.licensePlate}
            />
          </Field>
          <Field label={t.vehicles.makeLabel} required>
            <input
              className={inputClasses}
              onChange={(event) => updateField("make", event.target.value)}
              placeholder={t.vehicles.makePlaceholder}
              required
              value={form.make}
            />
          </Field>
          <Field label={t.vehicles.modelLabel} required>
            <input
              className={inputClasses}
              onChange={(event) => updateField("model", event.target.value)}
              placeholder={t.vehicles.modelPlaceholder}
              required
              value={form.model}
            />
          </Field>
          <Field label={t.vehicles.yearLabel}>
            <input
              className={inputClasses}
              min={1886}
              onChange={(event) => updateField("year", event.target.value)}
              placeholder={t.vehicles.yearPlaceholder}
              type="number"
              value={form.year}
            />
          </Field>
          <Field label={t.vehicles.initialOdometerLabel}>
            <input
              className={inputClasses}
              min={0}
              onChange={(event) => updateField("initialOdometer", event.target.value)}
              placeholder={t.vehicles.initialOdometerPlaceholder}
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
            <Link className={secondaryButtonClasses} href="/vehicles">
              {t.vehicles.cancel}
            </Link>
            <button className={primaryButtonClasses} disabled={isSubmitting} type="submit">
              {isSubmitting ? t.vehicles.saving : t.vehicles.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const toOptionalNumber = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue ? Number(trimmedValue) : null;
};

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";
const primaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

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

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}
