"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { newerVersion, updateApp } from "@/lib/app-update";

/** "A new version is ready · Update": one tap brings the newest website, logo and icons. */
export function AppUpdateBar() {
  const { locale } = useI18n();
  const km = locale === "km";
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const check = () => document.visibilityState === "visible" && newerVersion().then((x) => x && setReady(true));
    check();
    const id = setInterval(check, 10 * 60e3);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!ready || hidden) return null;
  return (
    <div className="fixed inset-x-3 top-[max(0.6rem,env(safe-area-inset-top))] z-[86] mx-auto flex max-w-md animate-[gwzPop_.3s_ease-out_both] items-center gap-3 rounded-2xl bg-forest px-4 py-3 text-white shadow-lift ring-1 ring-white/10">
      <RefreshCw size={20} className="flex-shrink-0 text-leaf" />
      <p className="min-w-0 flex-1 text-sm font-bold">{km ? "មានកំណែថ្មីរួចរាល់ហើយ" : "A new version is ready"}</p>
      <button
        type="button"
        onClick={() => {
          setBusy(true);
          updateApp();
        }}
        className="flex items-center gap-1.5 rounded-full bg-leaf px-4 py-2 text-sm font-extrabold text-forest"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Update
      </button>
      <button type="button" aria-label="close" onClick={() => setHidden(true)} className="text-white/60 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
