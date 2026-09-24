import { cookies } from "next/headers";
import { dictionaries } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./shared";

/** Server-side: the visitor's chosen language (cookie set by LanguageSwitcher). */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getI18n() {
  const locale = getLocale();
  return { locale, t: dictionaries[locale] };
}
