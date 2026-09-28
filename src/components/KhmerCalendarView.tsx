import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthInfo, khNum, KH_SOLAR_MONTHS, type LunarDay } from "@/lib/khmer-calendar";
import { cn } from "@/lib/utils/cn";

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const KH_DAYS_SHORT = ["អាទិ", "ចន្ទ", "អង្គ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A seated monk in an orange robe: the mark for a holy (sil) day. */
function Monk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {/* halo */}
      <circle cx="16" cy="9" r="7.5" fill="#FDE68A" opacity=".55" />
      {/* robe / seated body */}
      <path d="M5 29c0-7 4.6-12.5 11-12.5S27 22 27 29z" fill="#F97316" />
      <path d="M16 16.5c-2.6 0-4.9 1-6.6 2.7L20.5 29H27c0-6.4-4.1-11.6-9.9-12.4z" fill="#EA580C" />
      {/* hands together */}
      <path d="M14.6 19.5l1.4-3 1.4 3-1.4 3.6z" fill="#F5C9A0" />
      {/* head (shaved) and ears */}
      <circle cx="16" cy="10" r="5" fill="#F5C9A0" />
      <circle cx="10.9" cy="10.4" r="1.1" fill="#EBB88A" />
      <circle cx="21.1" cy="10.4" r="1.1" fill="#EBB88A" />
      {/* closed eyes and smile */}
      <path d="M13.6 10.2q1 .7 2 0M16.4 10.2q1 .7 2 0" stroke="#7C4A21" strokeWidth=".7" fill="none" strokeLinecap="round" />
      <path d="M14.9 12.4q1.1.8 2.2 0" stroke="#7C4A21" strokeWidth=".6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

type Mark = { km: string; en: string; kind: string };

/**
 * A month of the Khmer calendar, laid out like the popular Khmer calendar
 * apps: a green week header and Sunday column, equal day boxes with the day
 * number and the lunar day (Khmer numerals), a monk on holy days, shave days
 * and full moon noted, and the month's events listed underneath.
 * `extra` adds the zoo's own days off.
 */
export function KhmerCalendarView({ year, month, today, km, basePath, extra = [], theme = "green" }: { year: number; month: number; today: string; km: boolean; basePath: string; extra?: { date: string; name: string }[]; theme?: "green" | "blue" }) {
  const info = monthInfo(year, month);
  // the website's colours: green for visitors, blue in the staff area
  const C =
    theme === "blue"
      ? { main: "bg-[#1D4ED8]", border: "border-[#1D4ED8]", today: "bg-[#BFDBFE]", event: "text-[#1D4ED8]" }
      : { main: "bg-primary", border: "border-primary", today: "bg-leaf/45", event: "text-primary" };
  const marks = new Map<string, Mark[]>();
  for (const h of info.holidays) marks.set(h.date, [...(marks.get(h.date) ?? []), h]);
  for (const e of extra)
    if (e.date.startsWith(`${year}-${String(month).padStart(2, "0")}`) && !(marks.get(e.date) ?? []).some((h) => h.km === e.name)) marks.set(e.date, [...(marks.get(e.date) ?? []), { km: e.name, en: e.name, kind: "zoo" }]);
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const f = info.firstDay;
  const l = info.last;

  const tone = (date: string) => {
    const list = marks.get(date) ?? [];
    if (list.some((h) => h.kind === "public" || h.kind === "zoo")) return "holiday";
    if (list.length) return "event";
    return "plain";
  };
  const note = (d: LunarDay) => (d.fullMoon ? "ពេញបូណ៌មី" : d.shave ? "ថ្ងៃកោរ" : "");

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-1">
          <Link href={`${basePath}?m=${prev}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-black/5 active:scale-90" aria-label="previous"><ChevronLeft size={22} /></Link>
          <div>
            <p className="font-display text-3xl font-extrabold leading-none text-ink md:text-4xl">{KH_SOLAR_MONTHS[month - 1]}</p>
            <p className="mt-1 text-sm font-bold text-ink/70 md:text-base">{EN_MONTHS[month - 1]} {year}</p>
          </div>
          <Link href={`${basePath}?m=${next}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-black/5 active:scale-90" aria-label="next"><ChevronRight size={22} /></Link>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold leading-snug text-ink/85 md:text-lg">{info.lunarMonths.join(" - ")} ឆ្នាំ{l.animal}</p>
          <p className="text-sm font-semibold text-ink/60 md:text-base">
            {f.sak !== l.sak ? `${f.sak} → ${l.sak}` : l.sak} ព.ស. {khNum(l.beYear)}
          </p>
          {today.slice(0, 7) !== `${year}-${String(month).padStart(2, "0")}` && (
            <Link href={basePath} className={`mt-1 inline-block rounded-full ${C.main} px-3 py-1 text-xs font-bold text-white`}>{km ? "ខែនេះ" : "This month"}</Link>
          )}
        </div>
      </div>

      {/* month grid */}
      <div className={`overflow-hidden rounded-2xl border ${C.border} bg-white shadow-soft`}>
        <div className={`grid grid-cols-7 ${C.main}`}>
          {(km ? KH_DAYS_SHORT : EN_DAYS).map((w) => (
            <p key={w} className="py-2 text-center text-sm font-bold text-white md:py-3 md:text-lg">{w}</p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {info.grid.map(({ lunar: d, inMonth }, i) => {
            const sunday = i % 7 === 0;
            const isToday = d.date === today && inMonth;
            const t = inMonth ? tone(d.date) : "plain";
            const firstOfMonth = d.waxing && d.day === 1;
            const lunarText = firstOfMonth ? d.month : `${khNum(d.day)} ${d.phase}`;
            const extraNote = inMonth ? note(d) : "";
            const list = inMonth ? marks.get(d.date) ?? [] : [];
            return (
              <div
                key={d.date}
                title={list.map((h) => (km ? h.km : h.en)).join(" · ") || undefined}
                className={cn(
                  "relative flex aspect-[1/1.05] flex-col items-center justify-start border-b border-r border-black/10 px-0.5 pt-1.5 text-center md:aspect-[1.35/1] md:pt-3",
                  i % 7 === 6 && "border-r-0",
                  i >= info.grid.length - 7 && "border-b-0",
                  sunday && `${C.main} text-white`,
                  isToday && C.today,
                  !inMonth && "opacity-35"
                )}
              >
                {d.sil && inMonth && <Monk className="absolute left-0 top-0.5 h-6 w-6 md:left-2 md:top-2 md:h-9 md:w-9" />}
                <span
                  className={cn(
                    "text-xl font-bold leading-none md:text-3xl",
                    sunday ? "text-white" : t === "holiday" ? "text-[#E11D1D]" : t === "event" ? C.event : "text-[#111]",
                    sunday && t === "holiday" && "text-[#FFE0E0]"
                  )}
                >
                  {Number(d.date.slice(8))}
                </span>
                <span className={cn("mt-1 text-[10px] leading-tight md:text-sm", sunday ? "text-white/90" : t === "holiday" ? "text-[#E11D1D]" : t === "event" ? C.event : "text-ink/60")}>{lunarText}</span>
                {extraNote && <span className={cn("text-[9px] leading-tight md:text-xs", sunday ? "text-white/85" : "text-ink/55")}>{extraNote}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* the month's events */}
      {marks.size > 0 && (
        <ul className="space-y-2.5">
          {[...marks.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, list]) => {
              const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
              const t = tone(date);
              return (
                <li key={date} className="flex items-start gap-3">
                  <span className="w-11 flex-shrink-0 pt-2 text-center leading-tight">
                    <span className="block text-sm text-ink/70">{km ? KH_DAYS_SHORT[wd] : EN_DAYS[wd]}</span>
                    <span className="block text-lg font-bold text-ink">{Number(date.slice(8))}</span>
                  </span>
                  <span className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-2.5 shadow-sm">
                    {list.map((h, j) => (
                      <span key={j} className={cn("block text-[15px] leading-relaxed md:text-base", t === "holiday" && h.kind !== "observance" && h.kind !== "religious" ? "text-[#E11D1D]" : C.event)}>
                        {km ? h.km : h.en}
                        {h.kind === "zoo" && <span className="ml-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">{km ? "សួនសត្វឈប់" : "zoo closed"}</span>}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
        </ul>
      )}
      {month === 4 && (
        <p className={`rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] shadow-sm ${C.event}`}>
          {km
            ? `ចូលឆ្នាំខ្មែរ៖ ថ្ងៃទី ${info.newYear.day} ខែមេសា វេលាម៉ោង ${String(info.newYear.hour).padStart(2, "0")}:${String(info.newYear.minute).padStart(2, "0")}`
            : `Khmer New Year enters on ${info.newYear.day} April at ${String(info.newYear.hour).padStart(2, "0")}:${String(info.newYear.minute).padStart(2, "0")}`}
        </p>
      )}
    </div>
  );
}
