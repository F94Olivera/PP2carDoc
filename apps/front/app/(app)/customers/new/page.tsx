"use client";

import type { CreateCustomerRequest, CustomerResponse } from "@cardoc/types";
import Link from "next/link";
import { type SyntheticEvent, useState } from "react";
import { useI18n } from "../../../i18n/use-i18n";
import { createCustomer, getCustomerName } from "../customer-api";

type CustomerForm = {
  address: string;
  documentNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  notes: string;
  phone: string;
};

const initialForm: CustomerForm = {
  address: "",
  documentNumber: "",
  email: "",
  firstName: "",
  lastName: "",
  notes: "",
  phone: "",
};

export default function NewCustomerPage() {
  const { t } = useI18n();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<CustomerResponse | null>(null);

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const payload: CreateCustomerRequest = {
      address: toOptionalValue(form.address),
      documentNumber: toOptionalValue(form.documentNumber),
      email: toOptionalValue(form.email),
      firstName: form.firstName.trim(),
      lastName: toOptionalValue(form.lastName),
      notes: toOptionalValue(form.notes),
      phone: toOptionalValue(form.phone),
    };

    try {
      const customer = await createCustomer(payload, t.customers.createError);
      setCreatedCustomer(customer);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t.customers.createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdCustomer) {
    return (
      <div className="max-w-3xl">
        <BackLink label={t.customers.back} />
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {t.customers.createdSuccess}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {getCustomerName(createdCustomer)}
          </h2>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              href="/customers"
            >
              {t.customers.backToCustomers}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              href={`/vehicles/new?customerId=${createdCustomer.id}`}
            >
              {t.customers.addVehicle}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <BackLink label={t.customers.back} />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t.customers.createTitle}</h2>

        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <Field label={t.customers.firstNameLabel} required>
            <input
              className={inputClasses}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder={t.customers.firstNamePlaceholder}
              required
              value={form.firstName}
            />
          </Field>

          <Field label={t.customers.lastNameLabel}>
            <input
              className={inputClasses}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder={t.customers.lastNamePlaceholder}
              value={form.lastName}
            />
          </Field>

          <Field label={t.customers.emailLabel}>
            <input
              className={inputClasses}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={t.customers.emailPlaceholder}
              type="email"
              value={form.email}
            />
          </Field>

          <Field label={t.customers.phoneLabel}>
            <input
              className={inputClasses}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder={t.customers.phonePlaceholder}
              value={form.phone}
            />
          </Field>

          <Field label={t.customers.documentLabel}>
            <input
              className={inputClasses}
              onChange={(event) => updateField("documentNumber", event.target.value)}
              placeholder={t.customers.documentPlaceholder}
              value={form.documentNumber}
            />
          </Field>

          <Field label={t.customers.addressLabel}>
            <input
              className={inputClasses}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder={t.customers.addressPlaceholder}
              value={form.address}
            />
          </Field>

          <Field label={t.customers.notesLabel}>
            <textarea
              className={`${inputClasses} min-h-24 resize-y py-3`}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder={t.customers.notesPlaceholder}
              value={form.notes}
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              href="/customers"
            >
              {t.customers.cancel}
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t.customers.saving : t.customers.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const toOptionalValue = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";

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
      href="/customers"
    >
      <span aria-hidden="true">{"<-"}</span>
      {label}
    </Link>
  );
}
