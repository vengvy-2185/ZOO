import Link from "next/link";
import { ChevronLeft, ChevronRight, Moon, Sparkles, Landmark, Flower2 } from "lucide-react";
import { monthInfo, khNum, lunarLabel, KH_SOLAR_MONTHS, KH_WEEKDAYS, type LunarDay } from "@/lib/khmer-calendar";
import { cn } from "@/lib/utils/cn";

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A month of the Khmer calendar: each day with its Gregorian number, its
 * lunar day (e.g. ២រោច), the lunar month where one starts, holy days (ថ្ងៃសីល)
 * and Cambodian holidays; then the month's holidays as a list.
 * `extra` adds the zoo's own days off (e.g. set by managers).
 */
export function KhmerCalendarView({ year, month, today, km, basePath, extra = [], theme = "green" }: { year: number; month: number; today: string; km: boolean; basePath: string; extra?: { date: string; name: string }[]; theme?: "green" | "blue" }) {
  const info = monthInfo(year, month);
  const hol = new Map<string, { km: string; en: string; kind: string }[]>();
  for (const h of info.holidays) hol.set(h.date, [...(hol.get(h.date) ?? []), h]);
  for (const e of extra) if (e.date.startsWith(`${year}-${String(month).padStart(2, "0")}`) && !(hol.get(e.date) ?? []).some((h) => h.km === e.name)) hol.set(e.date, [...(hol.get(e.date) ?? []), { km: e.name, en: e.name, kind: "zoo" }]);
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const thisMonth = today.slice(0, 7);
  const n = (v: number | string) => (km ? khNum(v) : String(v));
  const accent = theme === "blue" ? { bar: "from-[#1E3A8A] to-[#2563EB]", ring: "ring-[#2563EB]", text: "text-[#1D4ED8]", soft: "bg-[#EEF2FF]" } : { bar: "from-forest to-primary", ring: "ring-primary", text: "text-primary", soft: "bg-light-green" };
  const f = info.firstDay;
  const l = info.last;
  const yearLine = km
    ? `ឆ្នាំ${f.animal} ${f.sak} ព.ស. ${khNum(f.beYear)}${l.beYear !== f.beYear || l.animal !== f.animal ? ` → ឆ្នាំ${l.animal} ${l.sak} ព.ស. ${khNum(l.beYear)}` : ""}`
    : `Year of the ${f.animal} · BE ${f.beYear}${l.beYear !== f.beYear ? ` → ${l.beYear}` : ""}`;
  const cells: (LunarDay | null)[] = [...Array(info.lead).fill(null), ...info.days];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-black/5">
        {/* header */}
        <div className={cn("bg-gradient-to-r p-4 text-white md:p-6", accent.bar)}>
          <div className="flex items-center gap-2">
            <Link href={`${basePath}?m=${prev}`} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-90" aria-label="previous"><ChevronLeft size={22} /></Link>
            <div className="min-w-0 flex-1 text-center">
              <p className="font-display text-2xl font-extrabold md:text-3xl">{km ? `ខែ${KH_SOLAR_MONTHS[month - 1]} ${khNum(year)}` : `${EN_MONTHS[month - 1]} ${year}`}</p>
              <p className="mt-0.5 text-sm font-bold text-white/85">
                <Moon size={14} className="-mt-0.5 mr-1 inline" />
                {km ? `ខែ${info.lunarMonths.join(" – ខែ")}` : info.lunarMonths.join(" – ")}
              </p>
              <p className="text-xs font-semibold text-white/70">{yearLine}</p>
            </div>
            <Link href={`${basePath}?m=${next}`} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-90" aria-label="next"><ChevronRight size={22} /></Link>
          </div>
          {`${year}-${String(month).padStart(2, "0")}` !== thisMonth && (
            <div className="mt-3 text-center">
              <Link href={basePath} className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold hover:bg-white/25">{km ? "ខែនេះ" : "This month"}</Link>
            </div>
          )}
        </div>

        {/* grid */}
        <div className="p-2 md:p-4">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {(km ? KH_WEEKDAYS : EN_DAYS).map((w, i) => (
              <p key={w} className={cn("pb-1 text-center text-[11px] font-bold md:text-sm", i === 0 ? "text-red-500" : "text-ink/50")}>{km ? w.replace("ព្រហស្បតិ៍", "ព្រហ") : w}</p>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`x${i}`} />;
              const hs = hol.get(d.date) ?? [];
              const isHoliday = hs.some((h) => h.kind === "public" || h.kind === "zoo");
              const isReligious = !isHoliday && hs.some((h) => h.kind === "religious");
              const isToday = d.date === today;
              const sunday = new Date(`${d.date}T12:00:00Z`).getUTCDay() === 0;
              const newMonth = d.day === 1 && d.waxing;
              return (
                <div
                  key={d.date}
                  title={hs.map((h) => (km ? h.km : h.en)).join(" · ") || undefined}
                  className={cn(
                    "relative flex min-h-[4.2rem] flex-col rounded-xl p-1 ring-1 transition md:min-h-[6.5rem] md:rounded-2xl md:p-2",
                    isHoliday ? "bg-red-50 ring-red-200" : isReligious ? "bg-amber-50 ring-amber-200" : "bg-white ring-black/5",
                    isToday && cn("ring-2", accent.ring)
                  )}
                >
                  <div className="flex items-start justify-between gap-0.5">
                    <span className={cn("font-display text-lg font-extrabold leading-none md:text-2xl", isHoliday || sunday ? "text-red-600" : "text-forest", isToday && accent.text)}>{n(Number(d.date.slice(8)))}</span>
                    {d.sil && <span className="text-[11px] leading-none text-amber-500 md:text-sm" title={km ? "ថ្ងៃសីល" : "Holy day"}>{d.waxing && d.day === 15 ? "🌕" : d.day === 8 ? "◐" : "🌑"}</span>}
                  </div>
                  <span className={cn("mt-0.5 text-[10px] font-bold leading-tight md:text-xs", d.waxing ? "text-ink/55" : "text-ink/40")}>{khNum(d.day)}{d.phase}</span>
                  {newMonth && <span className={cn("mt-0.5 w-fit rounded px-1 text-[9px] font-extrabold md:text-[10px]", accent.soft, accent.text)}>ខែ{d.month}</span>}
                  {hs.length > 0 && <span className={cn("mt-auto line-clamp-2 text-[9px] font-bold leading-tight md:text-[11px]", isHoliday ? "text-red-700" : "text-amber-700")}>{km ? hs[0].km.replace("ពិធីបុណ្យ", "បុណ្យ").replace("ព្រះរាជពិធី", "") : hs[0].en}</span>}
                  {isToday && <span className={cn("absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] font-extrabold text-white", theme === "blue" ? "bg-[#1D4ED8]" : "bg-primary")}>{km ? "ថ្ងៃនេះ" : "today"}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs font-semibold text-ink/55">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-200" /> {km ? "ថ្ងៃឈប់សម្រាក" : "Public holiday"}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" /> {km ? "បុណ្យសាសនា" : "Religious day"}</span>
            <span>🌕 ◐ 🌑 {km ? "ថ្ងៃសីល" : "Holy (sil) days"}</span>
          </div>
        </div>
      </section>

      {/* this month's holidays */}
      <section className="rounded-[2rem] bg-white p-4 shadow-soft ring-1 ring-black/5 md:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Sparkles size={20} className="text-red-500" /> {km ? "ថ្ងៃបុណ្យ និងថ្ងៃឈប់ខែនេះ" : "Holidays this month"}</h2>
        {hol.size === 0 ? (
          <p className="text-sm text-ink/50">{km ? "ខែនេះគ្មានថ្ងៃបុណ្យទេ។" : "No holidays this month."}</p>
        ) : (
          <ul className="space-y-2">
            {[...hol.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([date, list]) => list.map((h, j) => ({ date, h, j })))
              .map(({ date, h, j }) => {
                const d = info.days[Number(date.slice(8)) - 1];
                const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
                const Icon = h.kind === "religious" ? Flower2 : Landmark;
                return (
                  <li key={`${date}${j}`} className={cn("flex items-center gap-3 rounded-2xl p-3 ring-1", h.kind === "religious" ? "bg-amber-50/60 ring-amber-100" : "bg-red-50/60 ring-red-100")}>
                    <span className={cn("flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-white", h.kind === "religious" ? "bg-amber-500" : "bg-red-500")}>
                      <span className="font-display text-xl font-extrabold leading-none">{n(Number(date.slice(8)))}</span>
                      <span className="text-[10px] font-bold">{km ? KH_WEEKDAYS[wd].replace("ព្រហស្បតិ៍", "ព្រហ") : EN_DAYS[wd]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold leading-snug text-forest">{km ? h.km : h.en}</span>
                      <span className="block text-xs font-semibold text-ink/50">{lunarLabel(d)}</span>
                    </span>
                    <Icon size={18} className={h.kind === "religious" ? "text-amber-500" : "text-red-400"} />
                  </li>
                );
              })}
          </ul>
        )}
        {month === 4 && (
          <p className="mt-3 rounded-2xl bg-light-green px-4 py-2.5 text-sm font-bold text-primary">
            {km ? `ចូលឆ្នាំខ្មែរ៖ ថ្ងៃ${KH_WEEKDAYS[new Date(Date.UTC(info.newYear.year, info.newYear.month - 1, info.newYear.day)).getUTCDay()]} ទី${khNum(info.newYear.day)} ខែមេសា វេលាម៉ោង ${khNum(info.newYear.hour)} និង ${khNum(info.newYear.minute)} នាទី` : `Khmer New Year enters on ${info.newYear.day} April at ${String(info.newYear.hour).padStart(2, "0")}:${String(info.newYear.minute).padStart(2, "0")}`}
          </p>
        )}
      </section>
    </div>
  );
}
