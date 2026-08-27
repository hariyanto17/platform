"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, getLocaleLabel, localeOptions, locales, type Locale, type TranslationDictionary } from "@/locales";

const STORAGE_KEY = "platform_language";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  localeLabel: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const segments = key.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current == null || typeof current !== "object" || !(segment in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const savedLocale = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (savedLocale === "id" || savedLocale === "en") {
        return savedLocale;
      }
    }
    return defaultLocale;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const t = (key: string, fallback?: string) => {
    const dictionary = locales[locale] as TranslationDictionary;
    const value = getNestedValue(dictionary as unknown as Record<string, unknown>, key) ?? fallback ?? key;
    return value;
  };

  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const dateValue = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", options).format(dateValue);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", options).format(value);

  const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
      ...options,
    }).format(value);

  const localeLabel = useMemo(() => getLocaleLabel(locale), [locale]);

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t, formatDate, formatNumber, formatCurrency, localeLabel }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export { localeOptions, defaultLocale, type Locale };
