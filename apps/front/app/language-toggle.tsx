"use client";

import { useI18n } from "./i18n/use-i18n";

type LanguageToggleProps = {
  className?: string;
};

const defaultClassName =
  "fixed right-16 top-4 z-50 flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-2 text-xs font-semibold uppercase text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800";

export function LanguageToggle({ className = defaultClassName }: LanguageToggleProps) {
  const { locale, t, toggleLocale } = useI18n();

  return (
    <button
      aria-label={t.common.languageToggleLabel}
      className={className}
      onClick={toggleLocale}
      suppressHydrationWarning
      title={t.common.languageToggleLabel}
      type="button"
    >
      {locale}
    </button>
  );
}
