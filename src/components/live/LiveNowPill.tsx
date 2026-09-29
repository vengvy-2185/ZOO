"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** On the visitor pages: a red "LIVE" button while the zoo is live. */
export function LiveNowPill() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const [live, setLive] = useState<{ id: string; title: string; viewers: number } | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const hidden = /^\/(live|staff|admin|pay|checkout|ticket|scan)/.test(pathname);
  useEffect(() => {
    if (hidden) return;
    let alive = true;
    const load = () =>
      fetch("/api/live/now")
        .then((r) => r.json())
        .then((x) => alive && setLive(x))
        .catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [hidden]);
  if (hidden || !live || closed === live.id) return null;
  return (
    <div className="fixed bottom-[5.5rem] left-3 z-[45] flex max-w-[calc(100vw-6rem)] animate-[gwzPop_.35s_ease-out_both] items-center overflow-hidden rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lift ring-4 ring-white/70 md:bottom-6 md:left-6">
      <Link href={`/live/${live.id}`} className="flex min-w-0 items-center gap-2 py-2 pl-2 pr-3">
        <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] font-black tracking-[0.2em]">LIVE {locale === "km" ? "· ផ្ទាល់" : "NOW"}</span>
          <span className="block truncate text-sm font-bold">{live.title}</span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-1 text-xs font-bold text-white/85"><Eye size={13} /> {live.viewers}</span>
      </Link>
      <button type="button" onClick={() => setClosed(live.id)} aria-label="close" className="mr-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
        <X size={14} />
      </button>
    </div>
  );
}
