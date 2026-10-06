"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import { getFinances } from "./finance-api";

type QuickFilter = "currentMonth" | "last30" | "last60" | "last90";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const getCurrentMonthRange = () => {
  const today = new Date();

  return {
    endDate: toDateInputValue(today),
    startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
  };
};

const getLastDaysRange = (days: number) => {
  const today = new Date();

  return {
    endDate: toDateInputValue(today),
    startDate: toDateInputValue(addDays(today, -(days - 1))),
  };
};

const getQuickFilterRange = (filter: QuickFilter) => {
  if (filter === "currentMonth") {
    return getCurrentMonthRange();
  }

  return getLastDaysRange(filter === "last30" ? 30 : filter === "last60" ? 60 : 90);
};

const formatDisplayDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00`));

export default function FinancesPage() {
  const { t } = useI18n();
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [activeFilter, setActiveFilter] = useState<QuickFilter | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRangeValid = startDate !== "" && endDate !== "" && startDate <= endDate;
  const displayRange =
    startDate !== "" && endDate !== ""
      ? t.finances.rangeLabel(formatDisplayDate(startDate), formatDisplayDate(endDate))
      : "";

  useEffect(() => {
    let isCurrentRequest = true;

    queueMicrotask(() => {
      if (!isCurrentRequest) {
        return;
      }

      if (!isRangeValid) {
        setTotal(null);
        setIsLoading(false);
        setError(startDate !== "" && endDate !== "" ? t.finances.invalidRange : null);
        return;
      }

      setIsLoading(true);
      setError(null);

      getFinances({
        endDate,
        fallbackError: t.finances.loadError,
        startDate,
      })
        .then((response) => {
          if (isCurrentRequest) {
            setTotal(response.total);
          }
        })
        .catch((loadError) => {
          if (isCurrentRequest) {
            setError(loadError instanceof Error ? loadError.message : t.finances.connectionError);
            setTotal(null);
          }
        })
        .finally(() => {
          if (isCurrentRequest) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [
    endDate,
    isRangeValid,
    startDate,
    t.finances.connectionError,
    t.finances.invalidRange,
    t.finances.loadError,
  ]);

  const applyQuickFilter = (filter: QuickFilter) => {
    const range = getQuickFilterRange(filter);
    setActiveFilter(filter);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const updateStartDate = (value: string) => {
    setActiveFilter(null);
    setStartDate(value);
  };

  const updateEndDate = (value: string) => {
    setActiveFilter(null);
    setEndDate(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {t.finances.sectionLabel}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.finances.title}</h2>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.finances.startDateLabel}>
            <input
              className={inputClasses}
              max={endDate || undefined}
              onChange={(event) => updateStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </Field>
          <Field label={t.finances.endDateLabel}>
            <input
              className={inputClasses}
              min={startDate || undefined}
              onChange={(event) => updateEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t.finances.quickFiltersLabel}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickFilterButton
              isActive={activeFilter === "currentMonth"}
              label={t.finances.currentMonthFilter}
              onClick={() => applyQuickFilter("currentMonth")}
            />
            <QuickFilterButton
              isActive={activeFilter === "last30"}
              label={t.finances.lastThirtyDaysFilter}
              onClick={() => applyQuickFilter("last30")}
            />
            <QuickFilterButton
              isActive={activeFilter === "last60"}
              label={t.finances.lastSixtyDaysFilter}
              onClick={() => applyQuickFilter("last60")}
            />
            <QuickFilterButton
              isActive={activeFilter === "last90"}
              label={t.finances.lastNinetyDaysFilter}
              onClick={() => applyQuickFilter("last90")}
            />
          </div>
        </div>
      </section>

      <section className="flex justify-center">
        <div className="flex aspect-square w-full max-w-sm flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t.finances.laborRevenueLabel}
            </p>
            {displayRange ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{displayRange}</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="break-words text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
              {total === null ? currencyFormatter.format(0) : currencyFormatter.format(total)}
            </p>
            {isLoading ? (
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                {t.finances.loading}
              </p>
            ) : null}
            {error ? <ErrorMessage message={error} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-blue-950";

const quickFilterBaseClasses =
  "h-11 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950";

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function QuickFilterButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={`${quickFilterBaseClasses} ${
        isActive
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}
