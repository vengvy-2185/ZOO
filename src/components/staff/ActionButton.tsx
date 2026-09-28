"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * A button that runs a server action with clear feedback: it presses in,
 * shows a spinner while working, then a tick for a moment, and refreshes
 * the page with the new data.
 */
export function ActionButton({ action, label, doneLabel, icon, className, confirm }: { action: () => Promise<unknown>; label: string; doneLabel?: string; icon?: React.ReactNode; className?: string; confirm?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        setErr(false);
        start(async () => {
          try {
            await action();
            setDone(true);
            router.refresh();
            setTimeout(() => setDone(false), 1800);
          } catch {
            setErr(true);
            setTimeout(() => setErr(false), 2500);
          }
        });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition duration-150 active:scale-95 disabled:cursor-wait disabled:opacity-80",
        done && "!bg-emerald-600 !text-white !ring-0",
        err && "!bg-red-600 !text-white !ring-0",
        className
      )}
    >
      <span className={cn("flex items-center", (pending || done) && "animate-[gwzPop_.3s_ease-out_both]")}>
        {pending ? <Loader2 size={15} className="animate-spin" /> : done ? <Check size={15} strokeWidth={3} /> : icon}
      </span>
      {done ? doneLabel ?? label : label}
    </button>
  );
}
