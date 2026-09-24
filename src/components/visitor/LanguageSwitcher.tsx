"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/shared";

// EN | ខ្មែរ toggle. Stores the choice in a cookie for a year and re-renders
// the current page on the server in the new language.
export function LanguageSwitcher({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Menus, buttons and other client parts switch immediately…
    setLocale(next);
    // …and the server-rendered content follows in the background.
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "flex items-center gap-0.5 rounded-full p-1 text-xs font-bold transition-opacity",
        tone === "light" ? "bg-light-green text-forest" : "bg-white/10 text-white",
        pending && "animate-pulse",
        className
      )}
    >
      <Languages size={14} className="mx-1 opacity-60" />
      {(["en", "km"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-full px-2.5 py-1 transition",
            locale === l
              ? tone === "light"
                ? "bg-primary text-white shadow-sm"
                : "bg-leaf text-forest"
              : tone === "light"
                ? "hover:bg-white"
                : "hover:bg-white/10"
          )}
        >
          {l === "en" ? "EN" : <span className="font-khmer">ខ្មែរ</span>}
        </button>
      ))}
    </div>
  );
}
