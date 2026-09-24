"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, type Locale } from "./shared";

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

// The locale is read from the cookie on the server (root layout) and handed
// down here. It is also kept in client state so the language switch can
// update every client component instantly, before the server re-render
// (router.refresh) arrives with the translated server content.
export function LocaleProvider({ locale: serverLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(serverLocale);

  // Follow the server once its refreshed render arrives.
  useEffect(() => setLocale(serverLocale), [serverLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useI18n(): { locale: Locale; t: Dictionary; setLocale: (l: Locale) => void } {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, t: dictionaries[locale], setLocale };
}
