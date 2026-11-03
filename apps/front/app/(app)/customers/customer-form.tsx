"use client";

import type { CustomerResponse } from "@cardoc/types";
import { useVerifiedUser } from "../auth-guard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import {
  createCustomer,
  updateCustomer,
  getCustomerName,
  resetCustomerPassword,
} from "./customer-api";

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

export default function CustomerForm({ customer }: { customer?: CustomerResponse }) {
  const router = useRouter();
  const user = useVerifiedUser();
  const [mechanicId, setMechanicId] = useState("");
  const [password, setPassword] = useState("123qweASD");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const { t } = useI18n();
  const [form, setForm] = useState<CustomerForm>(
    customer
      ? {
          address: customer.address ?? "",
          documentNumber: customer.documentNumber ?? "",
          email: customer.email ?? "",
          firstName: customer.firstName,
          lastName: customer.lastName ?? "",
          notes: customer.notes ?? "",
          phone: customer.phone ?? "",
        }
      : initialForm,
  );
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

    const payload = {
      address: toOptionalValue(form.address),
      documentNumber: toOptionalValue(form.documentNumber),
      firstName: form.firstName.trim(),
      lastName: toOptionalValue(form.lastName),
      notes: toOptionalValue(form.notes),
      phone: toOptionalValue(form.phone),
    };

    try {
      if (customer) {
        await updateCustomer(String(customer.id), payload, t.customers.actionError);
        router.push(`/customers/${customer.id}`);
      } else {
        setCreatedCustomer(
          await createCustomer(
            {
              ...payload,
              email: form.email.trim().toLowerCase(),
              password,
              ...(user?.role === "GOD" ? { mechanicId: mechanicId.trim() } : {}),
            },
            t.customers.createError,
          ),
        );
      }
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
        <h2 className="text-2xl font-semibold tracking-tight">
          {customer ? t.customers.editAction : t.customers.createTitle}
        </h2>

        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {!customer && user?.role === "GOD" ? (
            <Field label={t.portal.mechanicId} required>
              <input
                className={inputClasses}
                required
                value={mechanicId}
                onChange={(event) => setMechanicId(event.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>
          ) : null}
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

          <Field label={t.customers.emailLabel} required>
            <input
              className={inputClasses}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={t.customers.emailPlaceholder}
              type="email"
              required
              disabled={Boolean(customer)}
              value={form.email}
            />
          </Field>

          {!customer ? (
            <Field label={t.login.passwordLabel} required>
              <input
                className={inputClasses}
                type="text"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          ) : null}

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
        {customer && user?.role === "MECHANIC" && customer.mechanicId === user.id ? (
          <form
            className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700"
            onSubmit={async (event) => {
              event.preventDefault();
              if (isResetting) return;
              setIsResetting(true);
              setResetMessage(null);
              setResetError(null);
              try {
                await resetCustomerPassword(customer.id, password, t.customers.actionError);
                setResetMessage(t.portal.passwordResetSuccess);
              } catch (error) {
                setResetError(error instanceof Error ? error.message : t.customers.actionError);
              } finally {
                setIsResetting(false);
              }
            }}
          >
            <Field label={t.portal.resetPassword} required>
              <input
                className={inputClasses}
                type="text"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <button
              className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              disabled={isResetting}
            >
              {isResetting ? t.customers.saving : t.portal.resetPassword}
            </button>
            {resetMessage ? <p role="status">{resetMessage}</p> : null}
            {resetError ? (
              <p role="alert" className="text-red-600">
                {resetError}
              </p>
            ) : null}
          </form>
        ) : null}
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
