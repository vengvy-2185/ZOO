"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { KioskQR, type KioskWindow } from "./KioskQR";

type Sched = { allowed: boolean; windows?: KioskWindow[]; dayOff?: string | null };

/**
 * For admins and managers, on EVERY page of the site: when an attendance
 * session starts, the QR pops up full screen by itself and closes when the
 * session ends. Checks the times again every minute, so changed rules
 * apply right away.
 */
export function GlobalAttendanceQR() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const [sched, setSched] = useState<Sched | null>(null);
  const allowed = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/staff/attendance-schedule", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Sched) => {
          allowed.current = Boolean(d?.allowed);
          if (alive) setSched(d);
        })
        .catch(() => {});
    load();
    const id = setInterval(() => {
      // only admins / managers keep checking; visitors are asked again when they change page
      if (allowed.current && document.visibilityState === "visible") load();
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pathname, locale]);

  // the QR screen page has its own big QR; sign-in pages never show it
  if (!sched?.allowed || !sched.windows || pathname.startsWith("/staff/attendance-qr") || pathname.endsWith("/login")) return null;
  return <KioskQR km={locale === "km"} windows={sched.windows} dayOff={sched.dayOff ?? null} overlayOnly />;
}
