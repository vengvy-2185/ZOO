"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarOff, Clock, MapPin, Maximize2, Minimize2, ShieldCheck, TimerReset } from "lucide-react";
import { drawKhqr } from "@/components/KhqrCard";
import { cn } from "@/lib/utils/cn";

export type KioskWindow = { session: "morning" | "afternoon"; openMin: number; startMin: number; graceMin: number; endMin: number };

const TZ = "Asia/Phnom_Penh";
const zooNow = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return g("hour") * 60 + g("minute") + g("second") / 60;
};
const hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;

/**
 * The attendance screen at the staff entrance. It opens the QR full screen
 * by itself when a session's check-in time starts (following the rules)
 * and closes it when the session ends; in between it counts down to the
 * next one. Nobody has to remember to open it, and it can't be left open
 * after hours. The QR itself changes every minute.
 */
export function KioskQR({ km, windows, dayOff, overlayOnly = false }: { km: boolean; windows: KioskWindow[]; dayOff: string | null; /** on other pages: only the full-screen pop-up (and a small "show QR" button once minimised) */ overlayOnly?: boolean }) {
  const [now, setNow] = useState(zooNow());
  const [img, setImg] = useState<string | null>(null);
  const [expires, setExpires] = useState(0);
  const [err, setErr] = useState(false);
  const [minimized, setMinimizedState] = useState(false);
  const wake = useRef<any>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(zooNow()), 500);
    return () => clearInterval(id);
  }, []);

  const active = dayOff ? null : windows.find((w) => now >= w.openMin && now < w.endMin) ?? null;
  const minKey = active ? `gwz_qr_min_${new Date().toDateString()}_${active.session}_${active.openMin}_${active.endMin}` : "";
  useEffect(() => {
    try {
      setMinimizedState(Boolean(minKey && sessionStorage.getItem(minKey)));
    } catch {}
  }, [minKey]);
  const setMinimized = (v: boolean) => {
    setMinimizedState(v);
    try {
      if (minKey) v ? sessionStorage.setItem(minKey, "1") : sessionStorage.removeItem(minKey);
    } catch {}
  };
  const next = dayOff ? null : windows.find((w) => now < w.openMin) ?? null;

  const load = useCallback(async () => {
    const r = await fetch("/api/staff/attendance-qr", { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (!r?.token) return setErr(true);
    setErr(false);
    setExpires(r.expiresAt);
    setImg(await drawKhqr(`${location.origin}/staff/checkin?t=${encodeURIComponent(r.token)}`, "/icon.svg"));
  }, []);

  // a session opens: fetch the QR, go full screen if the browser allows, keep the screen awake
  const activeKey = active?.session ?? null;
  useEffect(() => {
    if (!activeKey) {
      setImg(null);
      setMinimizedState(false);
      wake.current?.release?.().catch?.(() => {});
      wake.current = null;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    load();
    document.documentElement.requestFullscreen?.().catch(() => {}); // only works after a tap on some browsers; the overlay covers the screen anyway
    (navigator as any).wakeLock?.request?.("screen").then((l: any) => (wake.current = l)).catch(() => {});
  }, [activeKey, load]);
  // a new code every minute while open
  useEffect(() => {
    if (!activeKey || !expires) return;
    const t = setTimeout(load, Math.max(200, expires - Date.now() + 150));
    return () => clearTimeout(t);
  }, [activeKey, expires, load]);

  const left = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
  const pct = Math.min(1, Math.max(0, (expires - Date.now()) / 60000));
  const clock = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: TZ, numberingSystem: "latn" }).format(new Date());
  const name = (s: "morning" | "afternoon") => (s === "morning" ? (km ? "វេនព្រឹក" : "Morning") : km ? "វេនរសៀល" : "Afternoon");
  const L = km
    ? { scan: "ស្កេនដើម្បីកត់វត្តមាន", loc: "បើក Location លើទូរស័ព្ទ រួចស្កេន", changes: "QR ប្តូររៀងរាល់នាទី", onTime: (t: string) => `ស្កេនមុនម៉ោង ${t} = ទាន់ម៉ោង`, lateNow: "ឥឡូវស្កេន = យឺត", closes: (t: string) => `បិទនៅម៉ោង ${t}`, next: "វេនបន្ទាប់", opensAt: (t: string) => `QR បើកដោយខ្លួនឯងនៅម៉ោង ${t}`, inMin: (m: number) => (m >= 60 ? `ក្នុង ${Math.floor(m / 60)} ម៉ោង ${m % 60} នាទី` : `ក្នុង ${m} នាទី`), doneToday: "ថ្ងៃនេះលែងមានវេនទៀតហើយ", doneText: "QR នឹងបើកដោយខ្លួនឯងនៅវេនព្រឹកស្អែក។", off: "ថ្ងៃនេះឈប់សម្រាក", minimize: "បង្រួម", show: "បង្ហាញ QR ពេញអេក្រង់", keep: "ទុកទំព័រនេះឲ្យបើកនៅលើ tablet នៅច្រកចូល។", err: "មិនអាចទាញយក QR បានទេ។ កំពុងព្យាយាម…" }
    : { scan: "Scan to check in", loc: "Turn on Location on your phone, then scan", changes: "The QR changes every minute", onTime: (t: string) => `Scan before ${t} = on time`, lateNow: "Scanning now = late", closes: (t: string) => `Closes at ${t}`, next: "Next session", opensAt: (t: string) => `The QR opens by itself at ${t}`, inMin: (m: number) => (m >= 60 ? `in ${Math.floor(m / 60)} h ${m % 60} min` : `in ${m} min`), doneToday: "No more sessions today", doneText: "The QR opens by itself for tomorrow's morning session.", off: "Day off today", minimize: "Minimise", show: "Show QR full screen", keep: "Keep this page open on the tablet at the staff entrance.", err: "Couldn't load the QR. Trying again…" };

  // ── full-screen QR ──
  if (active && !minimized) {
    const late = now > active.startMin + active.graceMin;
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#172554] via-[#1D4ED8] to-[#2563EB] p-5 text-center text-white">
        <svg viewBox="0 0 400 400" className="pointer-events-none absolute -right-32 -top-32 h-[36rem] w-[36rem] opacity-[0.07]" aria-hidden><circle cx="200" cy="200" r="200" fill="#fff" /></svg>
        <button type="button" onClick={() => setMinimized(true)} className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25">
          <Minimize2 size={14} /> {L.minimize}
        </button>
        <p className="rounded-full bg-white/15 px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.25em] text-[#DBEAFE]">{name(active.session)} · {hm(active.startMin)}</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{L.scan}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-white/80"><MapPin size={16} /> {L.loc}</p>

        <div className="relative mt-4" style={{ width: "min(54vh, 84vw)" }}>
          <svg viewBox="0 0 100 100" className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] -rotate-90" aria-hidden>
            <rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
            <rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="#fff" strokeWidth="2" pathLength="100" strokeDasharray={`${pct * 100} 100`} style={{ transition: "stroke-dasharray .5s linear" }} />
          </svg>
          <div className="relative rounded-[1.75rem] bg-white p-3 shadow-2xl">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="Attendance QR" className="aspect-square w-full" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-2xl bg-[#EEF2FF]" />
            )}
          </div>
        </div>

        <p className="mt-5 font-mono text-4xl font-extrabold tabular-nums md:text-5xl">{clock}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          <span className={cn("rounded-full px-4 py-1.5", late ? "bg-amber-400 text-amber-950" : "bg-white text-[#1E3A8A]")}>{late ? L.lateNow : L.onTime(hm(Math.min(active.startMin + active.graceMin, active.endMin)))}</span>
          <span className="rounded-full bg-white/15 px-4 py-1.5"><ShieldCheck size={14} className="-mt-0.5 mr-1 inline" />{L.changes} · {left}s</span>
          <span className="rounded-full bg-white/15 px-4 py-1.5"><Clock size={14} className="-mt-0.5 mr-1 inline" />{L.closes(hm(active.endMin))}</span>
        </div>
        {err && <p className="mt-3 text-sm font-bold text-amber-200">{L.err}</p>}
      </div>
    );
  }

  // ── on other pages: nothing between sessions; a small button once minimised ──
  if (overlayOnly) {
    if (!active) return null;
    return (
      <button type="button" onClick={() => setMinimized(false)} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 py-2.5 text-sm font-extrabold text-white shadow-lift ring-4 ring-white animate-[gwzPop_.3s_ease] md:bottom-5 md:right-5 md:px-5 md:py-3 md:text-base">
        <Maximize2 size={18} /> <span className="md:hidden">QR · {name(active.session)}</span><span className="hidden md:inline">{L.show} · {name(active.session)}</span>
      </button>
    );
  }

  // ── waiting between sessions (or minimised) ──
  return (
    <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] p-6 text-center text-white shadow-lift">
      <p className="font-mono text-5xl font-extrabold tabular-nums">{clock}</p>
      {active && minimized ? (
        <>
          <p className="mt-4 font-display text-2xl font-extrabold">{name(active.session)}</p>
          <button type="button" onClick={() => setMinimized(false)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-extrabold text-[#1E3A8A] shadow-lift">
            <Maximize2 size={18} /> {L.show}
          </button>
        </>
      ) : dayOff ? (
        <div className="mt-5">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15"><CalendarOff size={30} /></span>
          <p className="mt-3 font-display text-2xl font-extrabold">{L.off}</p>
          <p className="text-sm text-white/80">{dayOff}</p>
        </div>
      ) : next ? (
        <div className="mt-5">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15"><TimerReset size={30} /></span>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">{L.next}</p>
          <p className="font-display text-3xl font-extrabold">{name(next.session)} · {hm(next.startMin)}</p>
          <p className="mt-2 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-[#1E3A8A]">{L.opensAt(hm(next.openMin))} · {L.inMin(Math.max(1, Math.ceil(next.openMin - now)))}</p>
        </div>
      ) : (
        <div className="mt-5">
          <p className="font-display text-2xl font-extrabold">{L.doneToday}</p>
          <p className="text-sm text-white/80">{L.doneText}</p>
        </div>
      )}
      <p className="mt-6 text-xs text-white/60">{L.keep}</p>
    </div>
  );
}
