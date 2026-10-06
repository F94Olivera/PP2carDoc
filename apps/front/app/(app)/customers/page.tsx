"use client";

import type { CustomerResponse, PaginationMeta } from "@cardoc/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import {
  getStoredListPageSize,
  listPageSizeOptions,
  storeListPageSize,
} from "../pagination-preferences";
import { archiveCustomer, deleteCustomer, getCustomerName, listCustomers } from "./customer-api";

type PendingAction =
  | { customer: CustomerResponse; type: "archive" }
  | { customer: CustomerResponse; type: "delete" }
  | null;

export default function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getStoredListPageSize());
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await listCustomers({
        fallbackError: t.customers.loadError,
        includeArchived,
        page,
        pageSize: query.trim() ? 100 : pageSize,
      });
      setCustomers(response.data);
      setMeta(response.meta);

      if (!query.trim() && response.meta.totalPages > 0 && page > response.meta.totalPages) {
        setPage(response.meta.totalPages);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.customers.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived, page, pageSize, query, t.customers.loadError]);

  useEffect(() => {
    queueMicrotask(() => void loadCustomers());
  }, [loadCustomers]);

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        getCustomerName(customer),
        customer.email,
        customer.phone,
        customer.documentNumber,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [customers, query]);

  const filteredPageCount = query.trim()
    ? Math.max(1, Math.ceil(visibleCustomers.length / pageSize))
    : (meta?.totalPages ?? 1);
  const currentPage = Math.min(page, filteredPageCount);
  const paginatedCustomers = query.trim()
    ? visibleCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : visibleCustomers;
  const shouldShowPagination =
    !isLoading && (query.trim() ? visibleCustomers.length > 0 : !!meta?.total);

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    storeListPageSize(nextPageSize);
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (pendingAction.type === "delete") {
        await deleteCustomer(pendingAction.customer.id, t.customers.deleteError);
      } else {
        await archiveCustomer(pendingAction.customer.id, false, t.customers.archiveError);
      }

      setPendingAction(null);
      await loadCustomers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.customers.actionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {t.customers.sectionLabel}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.customers.title}</h2>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          href="/customers/new"
        >
          <PlusIcon />
          {t.customers.newCustomer}
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <label className="relative block">
          <span className="sr-only">{t.customers.searchLabel}</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={t.customers.searchPlaceholder}
            value={query}
          />
        </label>

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input
            checked={includeArchived}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => {
              setIncludeArchived(event.target.checked);
              setPage(1);
            }}
            type="checkbox"
          />
          {t.customers.includeArchivedLabel}
        </label>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-5 hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 md:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t.customers.nameColumn}</th>
                <th className="px-4 py-3">{t.customers.emailColumn}</th>
                <th className="px-4 py-3">{t.customers.phoneColumn}</th>
                <th className="w-36 px-4 py-3 text-right">{t.customers.actionsColumn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedCustomers.map((customer) => (
                <tr
                  className={
                    !customer.isActive
                      ? "bg-slate-50/70 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                      : ""
                  }
                  key={customer.id}
                >
                  <td className="px-4 py-3 font-semibold">{getCustomerName(customer)}</td>
                  <td className="truncate px-4 py-3">{customer.email ?? "-"}</td>
                  <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <ActionLink href={`/customers/${customer.id}`} label={t.customers.viewAction}>
                        <EyeIcon />
                      </ActionLink>
                      {customer.isActive ? (
                        <ActionButton
                          label={t.customers.archiveAction}
                          onClick={() => setPendingAction({ customer, type: "archive" })}
                        >
                          <ArchiveIcon />
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        label={t.customers.deleteAction}
                        onClick={() => setPendingAction({ customer, type: "delete" })}
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

        <div className="mt-5 space-y-3 md:hidden">
          {paginatedCustomers.map((customer) => (
            <article
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              key={customer.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{getCustomerName(customer)}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {customer.email ?? t.customers.noEmail}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {customer.phone ?? t.customers.noPhone}
                  </p>
                </div>
                {!customer.isActive ? <StatusBadge label={t.customers.archivedStatus} /> : null}
              </div>
              <div className="mt-4 flex justify-end gap-1">
                <ActionLink href={`/customers/${customer.id}`} label={t.customers.viewAction}>
                  <EyeIcon />
                </ActionLink>
                {customer.isActive ? (
                  <ActionButton
                    label={t.customers.archiveAction}
                    onClick={() => setPendingAction({ customer, type: "archive" })}
                  >
                    <ArchiveIcon />
                  </ActionButton>
                ) : null}
                <ActionButton
                  label={t.customers.deleteAction}
                  onClick={() => setPendingAction({ customer, type: "delete" })}
                  tone="danger"
                >
                  <TrashIcon />
                </ActionButton>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && paginatedCustomers.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {query ? t.customers.emptySearch : t.customers.emptyList}
          </p>
        ) : null}

        {isLoading ? (
          <p className="py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.customers.loading}
          </p>
        ) : null}

        {shouldShowPagination ? (
          <Pagination
            onPageSizeChange={handlePageSizeChange}
            page={currentPage}
            pageCount={filteredPageCount}
            pageSize={pageSize}
            setPage={setPage}
          />
        ) : null}
      </div>

      {pendingAction ? (
        <ConfirmDialog
          confirmLabel={
            pendingAction.type === "delete" ? t.customers.deleteConfirm : t.customers.archiveConfirm
          }
          isSubmitting={isSubmitting}
          message={
            pendingAction.type === "delete"
              ? t.customers.deleteMessage(getCustomerName(pendingAction.customer))
              : t.customers.archiveMessage(getCustomerName(pendingAction.customer))
          }
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmAction}
          title={
            pendingAction.type === "delete" ? t.customers.deleteTitle : t.customers.archiveTitle
          }
          tone={pendingAction.type === "delete" ? "danger" : "default"}
        />
      ) : null}
    </div>
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
        tone === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

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
    <Link
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      href={href}
      title={label}
    >
      {children}
    </Link>
  );
}

function Pagination({
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  setPage,
}: {
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageCount: number;
  pageSize: number;
  setPage: (page: number) => void;
}) {
  return (
    <nav
      className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <div className="hidden w-24 sm:block" />
      <div className="flex justify-center gap-2">
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
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
          type="button"
        >
          {">"}
        </button>
      </div>
      <label className="flex justify-end">
        <span className="sr-only">Items per page</span>
        <select
          className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          {listPageSizeOptions.map((pageSizeOption) => (
            <option key={pageSizeOption} value={pageSizeOption}>
              {pageSizeOption}
            </option>
          ))}
        </select>
      </label>
    </nav>
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

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {label}
    </span>
  );
}

function PlusIcon() {
  return <span className="text-lg leading-none">+</span>;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m20 20-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 12s3.25-6 9-6 9 6 9 6-3.25 6-9 6-9-6-9-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M6 7v13h12V7M8 4h8l1 3H7l1-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M9.5 12h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7l1-3h4l1 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
