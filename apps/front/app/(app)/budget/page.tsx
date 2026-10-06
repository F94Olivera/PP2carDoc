"use client";

import type { BudgetPdfTemplateId, CreateBudgetPdfRequest } from "@cardoc/types";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/use-i18n";
import { apiUrl, getErrorMessage, handleUnauthorizedResponse } from "../../lib/auth-client";

type BudgetItem = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type BudgetDraft = {
  customerName: string;
  domain: string;
  vehicleName: string;
  budgetDate: string;
  templateId: BudgetPdfTemplateId;
  items: BudgetItem[];
};

const budgetDraftStorageKey = "cardoc-budget-draft";

const defaultBudgetItem: BudgetItem = {
  description: "",
  id: 1,
  quantity: 1,
  unitPrice: 0,
};

const defaultBudgetPdfTemplateId: BudgetPdfTemplateId = "classic";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const getFilenameFromDisposition = (contentDisposition: string | null) => {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);

  return match?.[1] ?? null;
};

const getBudgetPdfFilename = (budgetDate: string) => `presupuesto-${budgetDate}.pdf`;

export default function BudgetPage() {
  const { locale, t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [domain, setDomain] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [budgetDate, setBudgetDate] = useState(getDefaultBudgetDate);
  const [templateId, setTemplateId] = useState<BudgetPdfTemplateId>(defaultBudgetPdfTemplateId);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([defaultBudgetItem]);

  useEffect(() => {
    let draft: BudgetDraft | null = null;

    try {
      const storedDraft = window.localStorage.getItem(budgetDraftStorageKey);

      if (storedDraft) {
        draft = parseBudgetDraft(JSON.parse(storedDraft));
      }
    } catch {
      window.localStorage.removeItem(budgetDraftStorageKey);
    }

    queueMicrotask(() => {
      if (draft) {
        setCustomerName(draft.customerName);
        setDomain(draft.domain);
        setVehicleName(draft.vehicleName);
        setBudgetDate(draft.budgetDate);
        setTemplateId(draft.templateId);
        setItems(draft.items);
      }

      setIsDraftLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isDraftLoaded) {
      return;
    }

    const draft: BudgetDraft = {
      budgetDate,
      customerName,
      domain,
      items,
      templateId,
      vehicleName,
    };

    try {
      window.localStorage.setItem(budgetDraftStorageKey, JSON.stringify(draft));
    } catch {
      // Ignore storage quota/private-mode failures; the form still works in memory.
    }
  }, [budgetDate, customerName, domain, isDraftLoaded, items, templateId, vehicleName]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const updateItem = (id: number, changes: Partial<BudgetItem>) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      {
        description: "",
        id: Date.now(),
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.id !== id);
    });
  };

  const handleNumberFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  const toPositiveNumber = (rawValue: string, fallback: number) => {
    const normalizedValue = normalizeNumberInput(rawValue);

    if (!normalizedValue) {
      return fallback;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
  };

  const handleGeneratePdf = async () => {
    setPdfError(null);
    setIsGeneratingPdf(true);

    const payload: CreateBudgetPdfRequest = {
      templateId,
      customer: {
        fullName: customerName.trim(),
      },
      date: budgetDate,
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      vehicle: {
        name: vehicleName.trim(),
        plate: domain.trim().toUpperCase(),
      },
    };

    try {
      const response = await fetch(`${apiUrl}/budgets/pdf`, {
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
          Accept: "application/pdf",
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        if (handleUnauthorizedResponse(response)) {
          return;
        }

        setPdfError(await getErrorMessage(response, t.budget.pdfDefaultError));
        return;
      }

      const pdf = await response.blob();
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        getFilenameFromDisposition(response.headers.get("Content-Disposition")) ??
        getBudgetPdfFilename(budgetDate);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(t.budget.pdfConnectionError);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {t.budget.sectionLabel}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.budget.title}</h2>
        </div>
        <p className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:block">
          {t.budget.draftStatus}
        </p>
      </div>

      <form className="mt-8 space-y-7">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label={t.budget.customerLabel}>
            <input
              className={inputClasses}
              name="customer"
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={t.budget.customerPlaceholder}
              type="text"
              value={customerName}
            />
          </Field>
          <Field label={t.budget.domainLabel}>
            <input
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase text-slate-950 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
              name="domain"
              onChange={(event) => setDomain(event.target.value)}
              placeholder={t.budget.domainPlaceholder}
              type="text"
              value={domain}
            />
          </Field>
          <Field label={t.budget.vehicleLabel}>
            <input
              className={inputClasses}
              name="vehicle"
              onChange={(event) => setVehicleName(event.target.value)}
              placeholder={t.budget.vehiclePlaceholder}
              type="text"
              value={vehicleName}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label={t.budget.dateLabel}>
            <DatePicker
              locale={locale}
              onChange={setBudgetDate}
              translations={{
                nextMonth: t.budget.nextMonth,
                openCalendar: t.budget.openCalendar,
                previousMonth: t.budget.previousMonth,
                today: t.budget.today,
              }}
              value={budgetDate}
            />
          </Field>

          <Field label={t.budget.templateLabel}>
            <select
              className={inputClasses}
              onChange={(event) => setTemplateId(event.target.value as BudgetPdfTemplateId)}
              value={templateId}
            >
              <option value="classic">classic</option>
              {/* <option value="modern">modern</option> */}
              {/* <option value="pro">pro</option> */}
            </select>
          </Field>
        </div>

        <section>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.budget.itemsTitle}
            </h3>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/50"
              onClick={addItem}
              type="button"
            >
              <PlusIcon />
              {t.budget.addItem}
            </button>
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="w-[44%] px-4 py-3">{t.budget.descriptionColumn}</th>
                  <th className="w-[16%] px-4 py-3">{t.budget.quantityColumn}</th>
                  <th className="w-[18%] px-4 py-3">{t.budget.unitPriceColumn}</th>
                  <th className="w-[16%] px-4 py-3 text-right">{t.budget.totalColumn}</th>
                  <th className="w-[6%] px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3">
                      <input
                        className={compactInputClasses}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                        placeholder={t.budget.descriptionPlaceholder}
                        type="text"
                        value={item.description}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className={compactInputClasses}
                        min="1"
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Math.max(1, toPositiveNumber(event.target.value, 1)),
                          })
                        }
                        onFocus={handleNumberFocus}
                        inputMode="decimal"
                        type="text"
                        value={item.quantity}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className={compactInputClasses}
                        inputMode="decimal"
                        min="0"
                        onChange={(event) =>
                          updateItem(item.id, {
                            unitPrice: toPositiveNumber(event.target.value, 0),
                          })
                        }
                        onFocus={handleNumberFocus}
                        placeholder="0"
                        type="text"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {currencyFormatter.format(item.quantity * item.unitPrice)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        aria-label={t.budget.deleteItem}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        disabled={items.length === 1}
                        onClick={() => removeItem(item.id)}
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {items.map((item, index) => (
              <div
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                key={item.id}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.budget.itemLabel(index + 1)}</p>
                  <button
                    aria-label={t.budget.deleteItem}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.id)}
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  <Field label={t.budget.descriptionColumn}>
                    <input
                      className={inputClasses}
                      onChange={(event) => updateItem(item.id, { description: event.target.value })}
                      placeholder={t.budget.descriptionPlaceholder}
                      type="text"
                      value={item.description}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t.budget.quantityColumn}>
                      <input
                        className={inputClasses}
                        min="1"
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Math.max(1, toPositiveNumber(event.target.value, 1)),
                          })
                        }
                        onFocus={handleNumberFocus}
                        inputMode="decimal"
                        type="text"
                        value={item.quantity}
                      />
                    </Field>
                    <Field label={t.budget.unitPriceColumn}>
                      <input
                        className={inputClasses}
                        inputMode="decimal"
                        min="0"
                        onChange={(event) =>
                          updateItem(item.id, {
                            unitPrice: toPositiveNumber(event.target.value, 0),
                          })
                        }
                        onFocus={handleNumberFocus}
                        placeholder="0"
                        type="text"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold dark:border-slate-800">
                    <span>{t.budget.totalLabel}</span>
                    <span>{currencyFormatter.format(item.quantity * item.unitPrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-end">
          <BudgetNotice className="md:hidden" />

          <div className="space-y-4 lg:col-start-2">
            <div className="space-y-3 rounded-lg bg-slate-50 px-4 py-4 dark:bg-slate-950">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{t.budget.subtotalLabel}</span>
                <span className="font-semibold">{currencyFormatter.format(total)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t.budget.totalLabel}</span>
                <span>{currencyFormatter.format(total)}</span>
              </div>
            </div>

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingPdf}
              onClick={handleGeneratePdf}
              type="button"
            >
              {isGeneratingPdf ? t.budget.generatingPdf : t.budget.generatePdf}
              <PdfIcon />
            </button>

            {pdfError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {pdfError}
              </p>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-950";

const compactInputClasses =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-950";

const normalizeNumberInput = (value: string) => {
  const cleanValue = value.replace(/[^\d.,-]/g, "").trim();

  if (!cleanValue) {
    return "";
  }

  if (cleanValue.includes(",") && cleanValue.includes(".")) {
    return cleanValue.replace(/\./g, "").replace(",", ".");
  }

  if (cleanValue.includes(",")) {
    return cleanValue.replace(",", ".");
  }

  if (/^\d{1,3}(?:\.\d{3})+$/.test(cleanValue)) {
    return cleanValue.replace(/\./g, "");
  }

  return cleanValue;
};

const parseBudgetDraft = (value: unknown): BudgetDraft | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const draft = value as Partial<BudgetDraft>;
  const items = parseBudgetItems(draft.items);

  if (!items) {
    return null;
  }

  return {
    budgetDate:
      typeof draft.budgetDate === "string" && isIsoDate(draft.budgetDate)
        ? draft.budgetDate
        : getDefaultBudgetDate(),
    customerName: typeof draft.customerName === "string" ? draft.customerName : "",
    domain: typeof draft.domain === "string" ? draft.domain : "",
    items,
    templateId:
      typeof draft.templateId === "string" && isBudgetPdfTemplateId(draft.templateId)
        ? draft.templateId
        : defaultBudgetPdfTemplateId,
    vehicleName: typeof draft.vehicleName === "string" ? draft.vehicleName : "",
  };
};

const parseBudgetItems = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value
    .map((item, index): BudgetItem | null => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const candidate = item as Partial<BudgetItem>;

      if (typeof candidate.description !== "string") {
        return null;
      }

      const quantity = typeof candidate.quantity === "number" ? candidate.quantity : 1;
      const unitPrice = typeof candidate.unitPrice === "number" ? candidate.unitPrice : 0;

      return {
        description: candidate.description,
        id: typeof candidate.id === "number" ? candidate.id : Date.now() + index,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      };
    })
    .filter((item): item is BudgetItem => item !== null);

  return items.length > 0 ? items : null;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isBudgetPdfTemplateId = (value: string): value is BudgetPdfTemplateId => value === "classic";

function Field({
  children,
  label,
  optionalText,
}: {
  children: React.ReactNode;
  label: string;
  optionalText?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
        {optionalText ? (
          <span className="ml-1 font-medium text-slate-400 dark:text-slate-500">
            ({optionalText})
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function DatePicker({
  locale,
  onChange,
  translations,
  value,
}: {
  locale: string;
  onChange: (value: string) => void;
  translations: {
    nextMonth: string;
    openCalendar: string;
    previousMonth: string;
    today: string;
  };
  value: string;
}) {
  const selectedDate = parseIsoDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const weekDays = useMemo(() => getWeekDays(locale), [locale]);
  const displayValue = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(selectedDate);

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsOpen(false);
  };

  const moveMonth = (offset: number) => {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  return (
    <div className="relative max-w-xs">
      <button
        aria-expanded={isOpen}
        aria-label={translations.openCalendar}
        className={`${inputClasses} flex items-center justify-between pr-3 text-left`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span>{displayValue}</span>
        <span className="text-slate-400">
          <CalendarIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-13 z-40 w-[20rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <button
              aria-label={translations.previousMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => moveMonth(-1)}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
            <p className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-50">
              {monthLabel}
            </p>
            <button
              aria-label={translations.nextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => moveMonth(1)}
              type="button"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div
                className="flex h-8 items-center justify-center text-xs font-semibold uppercase text-slate-400"
                key={day}
              >
                {day}
              </div>
            ))}

            {calendarDays.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/50 dark:hover:text-blue-200"
                  } ${!isCurrentMonth && !isSelected ? "text-slate-300 dark:text-slate-600" : ""} ${
                    isToday && !isSelected ? "ring-1 ring-blue-200 dark:ring-blue-900" : ""
                  }`}
                  key={toIsoDate(date)}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={() => selectDate(new Date())}
            type="button"
          >
            {translations.today}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BudgetNotice({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div
      className={`rounded-lg bg-blue-50 px-4 py-4 text-sm font-medium leading-6 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100 ${className ?? ""}`}
    >
      <span className="mr-2 text-blue-700 dark:text-blue-300">+</span>
      {t.budget.pdfNoticeFirstLine}
      <br />
      {t.budget.pdfNoticeSecondLine}
    </div>
  );
}

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function getDefaultBudgetDate() {
  return toIsoDate(new Date());
}

const getCalendarDays = (visibleMonth: Date) => {
  const firstDayOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - mondayFirstOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return date;
  });
};

const getWeekDays = (locale: string) =>
  Array.from({ length: 7 }, (_, index) => {
    const monday = new Date(2026, 0, 5 + index);

    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(monday).slice(0, 2);
  });

const isSameDay = (firstDate: Date, secondDate: Date) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4v3M17 4v3M4.5 9h15M6 6h12a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7.5A1.5 1.5 0 0 1 6 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 8h12M9 8V5.5h6V8M9 11v6M15 11v6M7.5 8l.75 12h7.5L16.5 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.5h6.5L18 8v12.5H7V3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.5 3.5V8H18M9.5 16.5l2.5-2.5 2.5 2.5M12 14v5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
