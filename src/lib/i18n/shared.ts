import type { Locale } from "@/lib/utils/age";

export type { Locale };
export const LOCALES: Locale[] = ["en", "km"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "gwz_lang";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "km";
}

/**
 * Picks the Khmer version of a database field when the visitor chose ខ្មែរ
 * and a translation exists; otherwise falls back to the English value.
 */
export function pick<T extends string | null | undefined>(locale: Locale, en: T, km?: string | null): T | string {
  return locale === "km" && km ? km : en;
}

/** Row helper: pick(row.field, row.field_km) without repeating the row. */
export function pickField(locale: Locale, row: Record<string, any> | null | undefined, field: string): string | null {
  if (!row) return null;
  const km = row[`${field}_km`];
  return locale === "km" && km ? km : (row[field] ?? null);
}

/** Khmer name columns in this schema are called `khmer_name` rather than `name_km`. */
export function pickName(locale: Locale, row: { name?: string | null; khmer_name?: string | null } | null | undefined): string {
  if (!row) return "";
  return (locale === "km" && row.khmer_name) || row.name || "";
}
