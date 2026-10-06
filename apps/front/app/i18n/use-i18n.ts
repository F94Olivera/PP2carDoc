"use client";

import { useEffect, useSyncExternalStore } from "react";
import { defaultLocale, type Locale, locales, messages } from "./messages";

const storageKey = "cardoc-locale";
const changeEventName = "cardoc-locale-change";

const isLocale = (value: string | null): value is Locale =>
  locales.some((locale) => locale === value);

const getStoredLocale = (): Locale => {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const storedLocale = window.localStorage.getItem(storageKey);

  return isLocale(storedLocale) ? storedLocale : defaultLocale;
};

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEventName, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEventName, callback);
  };
};

export const setStoredLocale = (locale: Locale) => {
  window.localStorage.setItem(storageKey, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new Event(changeEventName));
};

export const useI18n = () => {
  const locale = useSyncExternalStore(subscribe, getStoredLocale, () => defaultLocale);

  useEffect(() => {
    if (!isLocale(window.localStorage.getItem(storageKey))) {
      window.localStorage.setItem(storageKey, locale);
    }

    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setStoredLocale(nextLocale);
  };

  const toggleLocale = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  return {
    locale,
    setLocale,
    toggleLocale,
    t: messages[locale],
  };
};
