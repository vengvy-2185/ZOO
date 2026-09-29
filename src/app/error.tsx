"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, WifiOff, Home, AlertTriangle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

const KEY = "gwz-auto-reload";

/**
 * Shown when something on a page fails. Most of the time it heals itself:
 * with internet, the page first reloads once by itself (this fixes a page left
 * open across an update, whose forms get an empty answer from the new server,
 * and passing server hiccups). Only if that doesn't help is this card shown,
 * and it says "no internet" only when the device really is offline.
 */
export default function PageError({ error }: { error: Error & { digest?: string } }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const staff = usePathname()?.startsWith("/staff");
  const [healing, setHealing] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error(error);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) || 0);
    } catch {}
    const recently = Date.now() - last < 20000;
    if (navigator.onLine !== false && !recently) {
      try {
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {}
      // after the reload a short note asks to enter the data again (see OfflineKit)
      try {
        sessionStorage.setItem("gwz-healed", "1");
      } catch {}
      location.reload();
      return;
    }
    setHealing(false);
  }, [error]);

  useEffect(() => {
    const on = () => {
      setOffline(false);
      location.reload();
    };
    const off = () => setOffline(true);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  const tone = staff ? { bg: "bg-[#EEF2FF] text-[#1D4ED8]", btn: "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white", title: "text-[#1E3A8A]" } : { bg: "bg-light-green text-primary", btn: "bg-primary hover:bg-forest text-white", title: "text-forest" };

  if (healing)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={34} className={`animate-spin ${staff ? "text-[#1D4ED8]" : "text-primary"}`} />
      </div>
    );

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${offline ? "bg-amber-50 text-amber-600" : tone.bg}`}>
          {offline ? <WifiOff size={30} /> : <AlertTriangle size={30} />}
        </span>
        <h1 className={`mt-4 font-display text-2xl font-extrabold ${tone.title}`}>
          {offline ? (km ? "គ្មាន internet" : "You're offline") : km ? "មានបញ្ហាបន្តិចបន្តួច" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {offline
            ? km
              ? "ទំព័រនឹងបើកឡើងវិញដោយខ្លួនឯង ពេល internet មកវិញ។"
              : "The page reloads by itself when the internet is back."
            : km
              ? "សូមចុច «សាកម្តងទៀត»។ ប្រសិនបើនៅតែមិនដំណើរការ សូមប្រាប់អ្នកគ្រប់គ្រង។"
              : "Please tap “Try again”. If it still doesn't work, tell a manager."}
        </p>
        {error?.digest && <p className="mt-2 font-mono text-[10px] text-ink/30">#{error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => location.reload()} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-soft transition active:scale-95 ${tone.btn}`}>
            <RefreshCw size={16} /> {km ? "សាកម្តងទៀត" : "Try again"}
          </button>
          <a href={staff ? "/staff" : "/"} className="btn-outline bg-white">
            <Home size={16} /> {km ? "ទំព័រដើម" : "Home"}
          </a>
        </div>
      </div>
    </div>
  );
}
