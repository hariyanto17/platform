import id from "./id";
import en from "./en";

export type Locale = "id" | "en";

export const locales = {
  id,
  en,
} as const;

export const defaultLocale: Locale = "id";

export const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: "id", label: "🇮🇩 Bahasa Indonesia" },
  { value: "en", label: "🇬🇧 English" },
];

export const getLocaleLabel = (locale: Locale) =>
  localeOptions.find((option) => option.value === locale)?.label || "🇮🇩 Bahasa Indonesia";

export type TranslationDictionary = typeof locales.id;
