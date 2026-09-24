"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { OPENING, toMinutes, zooNow } from "@/lib/data/events";

/** Live "Open now · closes 18:00" / "Closed now · opens 08:00" pill (zoo local time). */
export function OpenStatus({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = () => {
      const { minutes } = zooNow();
      setOpen(minutes >= toMinutes(OPENING.open) && minutes < toMinutes(OPENING.close));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (open === null) return null;
  const sep = locale === "km" ? " " : ", ";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur", open ? "bg-leaf/90 text-forest" : "bg-white/15 text-white ring-1 ring-white/25", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", open ? "bg-primary" : "bg-red-400")} />
      </span>
      {open ? `${t.extra.openNow}${sep}${t.extra.closesAt(OPENING.close)}` : `${t.extra.closedNow}${sep}${t.extra.opensAt(OPENING.open)}`}
    </span>
  );
}
