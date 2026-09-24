"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ScanLine, BarChart3, WifiOff, Undo2 } from "lucide-react";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";
import { formatFullDate } from "@/lib/utils/age";
import { addGateEntry } from "./actions";
import { cn } from "@/lib/utils/cn";

/** Big-button tally for the entrance gate. Counts update instantly; the server write follows. */
export function GateCounter({ initial, locale, embedded = false }: { initial: Record<string, number>; locale: string; /** Inside the admin shell (sidebar menu) instead of full screen. */ embedded?: boolean }) {
  const km = locale === "km";
  const [totals, setTotals] = useState(initial);
  const [bump, setBump] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<{ key: string; delta: number }[]>([]);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);

  const change = (key: string, delta: number, undoing = false) => {
    if (totals[key] + delta < 0) return;
    if (!undoing) setHistory((h) => [...h.slice(-49), { key, delta }]);
    setTotals((t) => ({ ...t, [key]: t[key] + delta }));
    setBump(key + delta);
    setTimeout(() => setBump(null), 250);
    if (navigator.vibrate) navigator.vibrate(15);
    addGateEntry(key, delta)
      .then(() => setFailed(false))
      .catch(() => {
        setTotals((t) => ({ ...t, [key]: t[key] - delta }));
        setFailed(true);
      });
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    change(last.key, -last.delta, true);
  };

  const today = formatFullDate(zooToday() + "T12:00:00", km ? "km" : "en");

  return (
    <div className={embedded ? "rounded-[2rem] bg-gradient-to-b from-forest to-[#0B3B21] pb-6 pt-1 text-white shadow-lift" : "min-h-screen bg-gradient-to-b from-forest to-[#0B3B21] pb-10 text-white"}>
      <header className={cn("mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-5", embedded && "hidden")}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-leaf">{km ? "រាប់ភ្ញៀវចូល" : "Gate counter"}</p>
          <p className="text-sm text-white/60">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/scanner" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">
            <ScanLine size={15} /> {km ? "ស្កេន" : "Scanner"}
          </Link>
          <Link href="/admin/visitors" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">
            <BarChart3 size={15} /> {km ? "ស្ថិតិ" : "Stats"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <div className="mt-5 rounded-[2rem] bg-white/10 p-5 text-center ring-1 ring-white/15 backdrop-blur">
          <p className="text-sm text-white/60">{km ? "ភ្ញៀវសរុបថ្ងៃនេះ" : "Visitors today"}</p>
          <p className="font-display text-6xl font-extrabold tabular-nums">{total}</p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            {GATE_CATEGORIES.map((c) => (
              <span key={c.key} className="h-full transition-all duration-500" style={{ width: total ? `${(totals[c.key] / total) * 100}%` : 0, background: c.color }} />
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20 disabled:opacity-30"
          >
            <Undo2 size={15} /> {km ? "ត្រឡប់វិញ" : "Undo"}
            {history.length > 0 && (
              <span className="text-white/60">
                ({history[history.length - 1].delta > 0 ? "+" : ""}
                {history[history.length - 1].delta} {GATE_CATEGORIES.find((c) => c.key === history[history.length - 1].key)?.emoji})
              </span>
            )}
          </button>
        </div>

        {failed && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-red-500/20 px-4 py-2.5 text-sm font-semibold">
            <WifiOff size={16} /> {km ? "មិនអាចរក្សាទុកបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយចុចម្តងទៀត។" : "Couldn't save. Check the connection and tap again."}
          </p>
        )}

        <div className="mt-4 grid gap-3">
          {GATE_CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-3xl bg-white p-3 text-ink shadow-lift">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: `${c.color}1f` }}>
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-forest">{km ? c.km : c.en}</p>
                <p className={`font-display text-3xl font-extrabold tabular-nums transition-transform ${bump?.startsWith(c.key) ? "scale-125" : ""}`} style={{ color: c.color }}>
                  {totals[c.key]}
                </p>
              </div>
              <button
                onClick={() => change(c.key, -1)}
                disabled={totals[c.key] === 0}
                aria-label={`-1 ${c.en}`}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-ink/60 active:scale-90 disabled:opacity-30"
              >
                <Minus size={22} />
              </button>
              <button
                onClick={() => change(c.key, 5)}
                className="hidden h-12 rounded-2xl px-3 text-sm font-extrabold text-white active:scale-90 sm:block"
                style={{ background: `${c.color}b3` }}
              >
                +5
              </button>
              <button
                onClick={() => change(c.key, 1)}
                aria-label={`+1 ${c.en}`}
                className="flex h-14 w-16 items-center justify-center rounded-2xl text-white shadow-soft active:scale-90"
                style={{ background: c.color }}
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/45">
          {km ? "ចុច + ពេលភ្ញៀវម្នាក់ចូល។ ចុច − ដើម្បីកែកំហុស។" : "Tap + for every visitor who walks in. Tap − to fix a mistake."}
        </p>
      </div>
    </div>
  );
}
