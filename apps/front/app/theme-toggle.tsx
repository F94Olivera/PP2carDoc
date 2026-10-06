"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useI18n } from "./i18n/use-i18n";

type Theme = "light" | "dark";

type ThemeToggleProps = {
  className?: string;
};

const storageKey = "cardoc-theme";
const changeEventName = "cardoc-theme-change";
const defaultClassName =
  "fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800";

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
};

const getStoredTheme = (): Theme => {
  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    return storedTheme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

const getServerTheme = (): Theme => "dark";

const subscribe = (callback: () => void) => {
  const handleThemeChange = () => {
    applyTheme(getStoredTheme());
    callback();
  };

  window.addEventListener("storage", handleThemeChange);
  window.addEventListener(changeEventName, handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleThemeChange);
    window.removeEventListener(changeEventName, handleThemeChange);
  };
};

const setStoredTheme = (theme: Theme) => {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the current tab usable when storage is unavailable.
  }

  applyTheme(theme);
  window.dispatchEvent(new Event(changeEventName));
};

export function ThemeToggle({ className = defaultClassName }: ThemeToggleProps) {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribe, getStoredTheme, getServerTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setStoredTheme(nextTheme);
  };

  return (
    <button
      aria-label={theme === "dark" ? t.theme.toLight : t.theme.toDark}
      className={className}
      onClick={toggleTheme}
      suppressHydrationWarning
      title={theme === "dark" ? t.theme.lightTitle : t.theme.darkTitle}
      type="button"
    >
      {theme === "dark" ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.49 20.49l-1.42-1.42M4 12H2M22 12h-2M4.93 19.07l-1.41 1.42M20.49 3.51l-1.42 1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.25 14.15A8 8 0 0 1 9.85 3.75 8 8 0 1 0 20.25 14.15Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </button>
  );
}
