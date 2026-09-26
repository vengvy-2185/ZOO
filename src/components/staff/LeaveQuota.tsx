"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Hourglass, Sparkles, CalendarDays } from "lucide-react";
import type { LeaveUsage } from "@/lib/server/staff";

/**
 * The staff member's leave allowance for this year: an animated ring with
 * what's left, one dot per allowed request, and the numbers underneath.
 */
export function LeaveQuota({ u, km }: { u: LeaveUsage; km: boolean }) {
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(u.remaining);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      setShown(Math.round(u.remaining * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [u.remaining]);

  const R = 52;
  const C = 2 * Math.PI * R;
  const frac = u.quota ? u.remaining / u.quota : 0;
  const tone = u.remaining === 0 ? { ring: "#EF4444", text: "text-red-600", soft: "bg-red-50" } : frac <= 0.25 ? { ring: "#F59E0B", text: "text-amber-600", soft: "bg-amber-50" } : { ring: "#10B981", text: "text-emerald-600", soft: "bg-emerald-50" };
  const L = km
    ? { title: "ច្បាប់ឆ្នាំនេះ", left: "នៅសល់", times: "ដង", of: (q: number) => `ក្នុងចំណោម ${q} ដង`, approved: "បានអនុញ្ញាត", pending: "កំពុងរង់ចាំ", days: "ថ្ងៃសម្រាកសរុប", none: "អ្នកបានប្រើច្បាប់អស់ហើយសម្រាប់ឆ្នាំនេះ។", low: (n: number) => `នៅសល់តែ ${n} ដងទៀតប៉ុណ្ណោះ។ ប្រើឲ្យបានល្អ!`, ok: "អ្នកនៅមានច្បាប់គ្រប់គ្រាន់។" }
    : { title: "Leave this year", left: "left", times: "times", of: (q: number) => `of ${q} allowed`, approved: "Approved", pending: "Waiting", days: "Days off in total", none: "You have used all your leave for this year.", low: (n: number) => `Only ${n} left. Use them wisely!`, ok: "You still have plenty of leave." };

  return (
    <section className="card overflow-hidden p-5 md:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        {/* ring */}
        <div className="relative h-36 w-36 flex-shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#EEF2FF" strokeWidth="12" />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke={tone.ring}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={on ? C * (1 - frac) : C}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-4xl font-extrabold leading-none ${tone.text}`}>{shown}</span>
            <span className="mt-1 text-[11px] font-bold text-ink/50">{L.left} · {L.of(u.quota)}</span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold text-forest">{L.title}</h2>
          {/* one dot per allowed request */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: Math.min(u.quota, 60) }, (_, i) => {
              const kind = i < u.approved ? "approved" : i < u.used ? "pending" : "free";
              return (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-500 ${kind === "approved" ? "bg-[#1D4ED8]" : kind === "pending" ? "bg-amber-400" : "bg-emerald-100 ring-1 ring-emerald-300"} ${on ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                />
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { Icon: CalendarCheck2, v: u.approved, k: L.approved, c: "bg-[#EEF2FF] text-[#1D4ED8]" },
              { Icon: Hourglass, v: u.pending, k: L.pending, c: "bg-amber-50 text-amber-700" },
              { Icon: CalendarDays, v: u.days, k: L.days, c: "bg-emerald-50 text-emerald-700" },
            ].map((x, i) => (
              <div key={x.k} className={`rounded-2xl p-3 transition-all duration-500 ${x.c} ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`} style={{ transitionDelay: `${300 + i * 120}ms` }}>
                <x.Icon size={16} />
                <p className="mt-1 font-display text-xl font-extrabold leading-none">{x.v}</p>
                <p className="mt-0.5 truncate text-[11px] font-bold opacity-75">{x.k}</p>
              </div>
            ))}
          </div>
          <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tone.soft} ${tone.text}`}>
            <Sparkles size={13} /> {u.remaining === 0 ? L.none : frac <= 0.25 ? L.low(u.remaining) : L.ok}
          </p>
        </div>
      </div>
    </section>
  );
}
