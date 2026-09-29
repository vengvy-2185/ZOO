"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// the first page of each app: nothing to go back to
const HOMES = ["/", "/staff", "/admin", "/staff/login", "/admin/login", "/account/login", "/admin/mfa"];

/**
 * When the site runs as an installed app there is no browser back button,
 * so every page (except each app's home) gets one. Browsers keep their own.
 */
export function AppBackButton() {
  const path = usePathname();
  const router = useRouter();
  const [app, setApp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const check = () => setApp(mq.matches || (navigator as any).standalone === true);
    check();
    mq.addEventListener?.("change", check);
    return () => mq.removeEventListener?.("change", check);
  }, []);

  if (!app || HOMES.includes(path)) return null;
  const staff = path.startsWith("/staff");
  const admin = path.startsWith("/admin");
  // with nothing earlier in this app's history, "back" goes to this app's home
  const home = staff ? "/staff" : admin ? "/admin" : "/";

  return (
    <button
      type="button"
      aria-label="ត្រឡប់ក្រោយ · Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(home))}
      className={cn(
        "fixed left-3 z-[65] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lift ring-2 ring-white/70 transition active:scale-90",
        staff ? "bg-[#1D4ED8]" : "bg-primary",
        // above the phone's bottom menu; lower on computers
        "bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:bottom-6"
      )}
    >
      <ChevronLeft size={26} strokeWidth={2.6} />
    </button>
  );
}
