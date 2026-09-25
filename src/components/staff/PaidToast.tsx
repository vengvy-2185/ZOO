"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * When the list refreshes by itself and a booking has just become paid
 * (a visitor paid on their phone, or at this counter), pop a clear notice
 * with a short chime, so nobody has to watch the list.
 */
export function PaidToast({ paid, km }: { paid: { code: string; name: string | null; total: number }[]; km: boolean }) {
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<{ code: string; name: string | null; total: number }[]>([]);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(paid.map((p) => p.code)); // what was already paid when the page opened
      return;
    }
    const fresh = paid.filter((p) => !seen.current!.has(p.code));
    if (!fresh.length) return;
    fresh.forEach((p) => seen.current!.add(p.code));
    setToasts((t) => [...fresh, ...t].slice(0, 3));
    try {
      const ctx = new AudioContext();
      [880, 1320].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.value = 0.12;
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.14);
        o.stop(ctx.currentTime + i * 0.14 + 0.12);
      });
      navigator.vibrate?.(80);
    } catch {
      /* sound is optional */
    }
    const id = setTimeout(() => setToasts((t) => t.slice(0, -fresh.length)), 9000);
    return () => clearTimeout(id);
  }, [paid]);

  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.code} className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-[#1D4ED8] p-3.5 text-white shadow-lift animate-[gwzDrop_.4s_ease]">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#1D4ED8]"><CheckCircle2 size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-extrabold">{km ? "បានទទួលប្រាក់!" : "Payment received!"} ${t.total.toFixed(2)}</span>
            <span className="block truncate text-xs text-white/80">{t.code}{t.name ? ` · ${t.name}` : ""}</span>
          </span>
          <button onClick={() => setToasts((x) => x.filter((y) => y.code !== t.code))} className="rounded-full p-1 text-white/70 hover:text-white" aria-label="close"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}
