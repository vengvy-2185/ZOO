"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, MapPin, ShieldCheck } from "lucide-react";
import { drawKhqr } from "@/components/KhqrCard";

/**
 * The attendance screen at the zoo: a QR that changes every minute (with a
 * countdown ring) that staff scan with their phone. Put it on a tablet at
 * the staff entrance; "Full screen" hides everything else.
 */
export function KioskQR({ km, sessionLabel }: { km: boolean; sessionLabel: string }) {
  const [img, setImg] = useState<string | null>(null);
  const [expires, setExpires] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState(false);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/staff/attendance-qr", { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (!r?.token) return setErr(true);
    setErr(false);
    setExpires(r.expiresAt);
    setImg(await drawKhqr(`${location.origin}/staff/checkin?t=${encodeURIComponent(r.token)}`, "/icon.svg"));
  }, []);

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [load]);
  // new code the moment this one runs out
  useEffect(() => {
    if (!expires) return;
    const t = setTimeout(load, Math.max(200, expires - Date.now() + 150));
    return () => clearTimeout(t);
  }, [expires, load]);

  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const left = Math.max(0, Math.ceil((expires - now) / 1000));
  const pct = Math.min(1, Math.max(0, (expires - now) / 60000));
  const clock = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(now));
  const L = km
    ? { title: "ស្កេនដើម្បីកត់វត្តមាន", sub: "បើកទីតាំង (Location) លើទូរស័ព្ទ រួចស្កេនដោយកាមេរ៉ា", changes: "QR ប្តូររៀងរាល់នាទី", full: "ពេញអេក្រង់", exit: "ចេញពីពេញអេក្រង់", err: "មិនអាចទាញយក QR បានទេ។ កំពុងព្យាយាមម្តងទៀត…" }
    : { title: "Scan to check in", sub: "Turn on Location on your phone, then scan with the camera", changes: "The QR changes every minute", full: "Full screen", exit: "Exit full screen", err: "Couldn't load the QR. Trying again…" };

  return (
    <div ref={box} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] p-6 text-center text-white shadow-lift [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:rounded-none">
      <button
        type="button"
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen())}
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25"
      >
        {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {full ? L.exit : L.full}
      </button>
      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-[#BFDBFE]">{sessionLabel}</p>
      <h2 className="mt-1 font-display text-3xl font-extrabold md:text-4xl">{L.title}</h2>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/80"><MapPin size={15} /> {L.sub}</p>

      <div className="relative mx-auto mt-6 w-full max-w-[22rem]">
        {/* countdown ring */}
        <svg viewBox="0 0 100 100" className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] -rotate-90" aria-hidden>
          <rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
          <rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="#fff" strokeWidth="2.5" pathLength="100" strokeDasharray={`${pct * 100} 100`} style={{ transition: "stroke-dasharray .25s linear" }} />
        </svg>
        <div className="relative rounded-3xl bg-white p-4 shadow-lift">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="Attendance QR" className="aspect-square w-full" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-[#EEF2FF]" />
          )}
        </div>
      </div>

      <p className="mt-6 font-mono text-5xl font-extrabold tabular-nums">{clock}</p>
      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
        <ShieldCheck size={15} /> {L.changes} · {left}s
      </p>
      {err && <p className="mt-3 text-sm font-bold text-amber-200">{L.err}</p>}
    </div>
  );
}
