import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, MapPin, Monitor, Printer, Settings2, Trash2, UserCheck, XCircle } from "lucide-react";
import { attendanceMonth, localDay, type DayMark, type PersonMonth } from "@/lib/server/attendance";
import { thisMonth } from "@/lib/server/staff";
import { cn } from "@/lib/utils/cn";
import { addHoliday, markSession, removeHoliday, saveAttendanceSettings } from "@/app/staff/(protected)/attendance-actions";
import { GeoFill } from "./GeoFill";

export type AttTab = "today" | "month" | "rules";
const usd = (n: number) => `$${n.toFixed(2)}`;
const WEEK = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], km: ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"] };
const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#2563EB]";

/** Colour + label for one half-day cell. */
function cell(k: DayMark["morning"], km: boolean) {
  const M = {
    ok: { c: "bg-[#1D4ED8]", en: "Present", km: "មក" },
    late: { c: "bg-amber-400", en: "Late", km: "យឺត" },
    absent: { c: "bg-red-500", en: "Absent", km: "អវត្តមាន" },
    leave: { c: "bg-violet-400", en: "Leave", km: "ច្បាប់" },
    off: { c: "bg-slate-200", en: "Rest day", km: "ថ្ងៃសម្រាក" },
    holiday: { c: "bg-slate-300", en: "Holiday", km: "ថ្ងៃបុណ្យ" },
    future: { c: "bg-white ring-1 ring-inset ring-black/10", en: "Not yet", km: "មិនទាន់ដល់" },
    none: { c: "bg-transparent", en: "", km: "" },
  } as const;
  const x = M[k];
  return { cls: x.c, label: km ? x.km : x.en };
}

/**
 * Attendance for admins and managers: today's check-ins, the monthly
 * calendar with totals (printable), and the rules (hours, grace, rest days,
 * holidays, location, late / absence deductions).
 */
export async function AttendanceManager({ tab, month, km, base }: { tab: AttTab; month?: string; km: boolean; base: string }) {
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : thisMonth();
  const data = await attendanceMonth(m);
  const { settings: s, people, today } = data;
  const L = km
    ? { today: "ថ្ងៃនេះ", month: "សរុបប្រចាំខែ", rules: "ច្បាប់ និងថ្ងៃសម្រាក", kiosk: "បើកអេក្រង់ QR", morning: "ព្រឹក", afternoon: "រសៀល", mark: "កត់ថាមក", undo: "ដកចេញ", none: "មិនទាន់មានបុគ្គលិក។", present: "មក", late: "យឺត", lateMin: "នាទីយឺត", absent: "អវត្តមាន", leave: "ច្បាប់", deduct: "កាត់ប្រាក់", print: "បោះពុម្ព", staff: "បុគ្គលិក", times: "ម៉ោងធ្វើការ", start: "ចាប់ផ្តើម", end: "បញ្ចប់", grace: "អនុគ្រោះ (នាទី)", openBefore: "បើកស្កេនមុន (នាទី)", restDays: "ថ្ងៃសម្រាកប្រចាំសប្តាហ៍", location: "ទីតាំងសួនសត្វ", lat: "Latitude", lng: "Longitude", radius: "ចម្ងាយអនុញ្ញាត (ម៉ែត្រ)", requireLoc: "ត្រូវតែបើក Location ពេលស្កេន", fees: "ការកាត់ប្រាក់ (ក្នុងប្រាក់ខែ)", lateFee: "ក្នុងមួយដងយឺត ($)", absFee: "ក្នុងមួយវេនអវត្តមាន ($)", save: "រក្សាទុក", holidays: "ថ្ងៃបុណ្យ / ថ្ងៃឈប់", holName: "ឈ្មោះថ្ងៃបុណ្យ", add: "បន្ថែម", noHol: "មិនទាន់មាន។", noLoc: "មិនទាន់កំណត់ទីតាំងសួនសត្វ៖ ពេលនេះមិនពិនិត្យចម្ងាយទេ។", manual: "កត់ដោយដៃ", checkedIn: "ស្កេនហើយ", waiting: "រង់ចាំ" }
    : { today: "Today", month: "Monthly summary", rules: "Rules & days off", kiosk: "Open QR screen", morning: "Morning", afternoon: "Afternoon", mark: "Mark present", undo: "Undo", none: "No staff yet.", present: "Present", late: "Late", lateMin: "Late min", absent: "Absent", leave: "Leave", deduct: "Deduction", print: "Print", staff: "Staff", times: "Working hours", start: "Start", end: "End", grace: "Grace (min)", openBefore: "Scan opens early (min)", restDays: "Weekly rest days", location: "Zoo location", lat: "Latitude", lng: "Longitude", radius: "Allowed distance (m)", requireLoc: "Location must be on to scan", fees: "Deductions (from pay)", lateFee: "Per late arrival ($)", absFee: "Per missed session ($)", save: "Save", holidays: "Holidays / days off", holName: "Holiday name", add: "Add", noHol: "None yet.", noLoc: "The zoo's location isn't set yet: distance isn't checked for now.", manual: "by hand", checkedIn: "Checked in", waiting: "Waiting" };

  const tabs: [AttTab, string][] = [["today", L.today], ["month", L.month], ["rules", L.rules]];
  const shift = (d: number) => {
    const [y, mo] = m.split("-").map(Number);
    const t = new Date(Date.UTC(y, mo - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const sep = base.includes("?") ? "&" : "?";
  const href = (o: Record<string, string>) => `${base}${sep}${new URLSearchParams({ at: tab, month: m, ...o })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([k, label]) => (
          <Link key={k} href={href({ at: k })} className={cn("rounded-full px-4 py-2 text-sm font-bold shadow-soft", tab === k ? "bg-[#1D4ED8] text-white" : "bg-white text-[#1E3A8A]")}>
            {k === "today" ? <UserCheck size={15} className="-mt-0.5 mr-1 inline" /> : k === "month" ? <CalendarDays size={15} className="-mt-0.5 mr-1 inline" /> : <Settings2 size={15} className="-mt-0.5 mr-1 inline" />}
            {label}
          </Link>
        ))}
        <Link href="/staff/attendance-qr" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-soft">
          <Monitor size={15} /> {L.kiosk}
        </Link>
      </div>

      {tab === "today" && (() => {
        const t = people.map((p) => ({ p, d: p.days[today] })).filter((x) => x.d && x.d.morning !== "none");
        const count = (k: "morning" | "afternoon") => t.filter((x) => x.d[k] === "ok" || x.d[k] === "late").length;
        return (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                [L.morning, `${count("morning")} / ${t.length}`],
                [L.afternoon, `${count("afternoon")} / ${t.length}`],
                [L.late, String(t.reduce((n, x) => n + (x.d.morning === "late" ? 1 : 0) + (x.d.afternoon === "late" ? 1 : 0), 0))],
              ].map(([k, v], i) => (
                <div key={k} className={i === 0 ? "rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-4 text-white shadow-lift" : "card p-4"}>
                  <p className={i === 0 ? "text-xs text-white/75" : "text-xs text-ink/55"}>{k}</p>
                  <p className="font-display text-2xl font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            <div className="card divide-y divide-black/5">
              {t.length === 0 && <p className="p-6 text-center text-sm text-ink/55">{L.none}</p>}
              {t.map(({ p, d }) => (
                <div key={p.userId} className="flex flex-wrap items-center gap-3 p-3.5">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] font-display font-extrabold text-[#1D4ED8]">{[...p.name][0]?.toUpperCase()}</span>
                  <span className="min-w-[8rem] flex-1">
                    <span className="block truncate font-bold text-forest">{p.name}</span>
                    <span className="block text-xs text-ink/50">{p.staffNo} · {(km && p.positionKm) || p.position}</span>
                  </span>
                  {(["morning", "afternoon"] as const).map((sess) => {
                    const k = d[sess];
                    const c = cell(k, km);
                    const time = sess === "morning" ? d.mIn : d.aIn;
                    const done = k === "ok" || k === "late";
                    return (
                      <div key={sess} className="flex items-center gap-2 rounded-2xl bg-[#F8FAFF] px-2.5 py-1.5 ring-1 ring-[#2563EB]/10">
                        <span className={cn("h-3 w-3 rounded-full", c.cls)} />
                        <span className="text-xs">
                          <b className="text-[#1E3A8A]">{sess === "morning" ? L.morning : L.afternoon}</b>
                          <span className="block text-ink/55">{done ? `${time ?? ""} ${k === "late" ? `· ${L.late}` : ""}` : c.label || L.waiting}</span>
                        </span>
                        <form action={markSession.bind(null, p.userId, today, sess, !done)}>
                          <button className={cn("rounded-lg px-2 py-1 text-[11px] font-bold", done ? "text-ink/40 hover:text-red-600" : "bg-[#1D4ED8] text-white")}>{done ? L.undo : L.mark}</button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {tab === "month" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href({ month: shift(-1) })} className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-[#1E3A8A] shadow-soft">←</Link>
            <span className="min-w-[10rem] rounded-full bg-[#1E3A8A] px-5 py-2 text-center font-display font-extrabold text-white">{monthLabel}</span>
            <Link href={href({ month: shift(1) })} className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-[#1E3A8A] shadow-soft">→</Link>
            <Link href={`/staff/team/print?month=${m}`} target="_blank" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1E3A8A] shadow-soft"><Printer size={15} /> {L.print}</Link>
          </div>
          <MonthGrid people={people} days={data.days} holidays={data.holidays} km={km} labels={L} />
          <Legend km={km} />
        </>
      )}

      {tab === "rules" && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
          <form action={saveAttendanceSettings} className="card space-y-5 p-5">
            <fieldset>
              <legend className="mb-2 flex items-center gap-2 font-display font-extrabold text-forest"><Clock size={17} className="text-[#1D4ED8]" /> {L.times}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["morning_start", `${L.morning} · ${L.start}`, s.morning_start], ["morning_end", `${L.morning} · ${L.end}`, s.morning_end], ["afternoon_start", `${L.afternoon} · ${L.start}`, s.afternoon_start], ["afternoon_end", `${L.afternoon} · ${L.end}`, s.afternoon_end]].map(([n, l, v]) => (
                  <label key={n} className="text-xs font-bold text-ink/55">{l}<input type="time" name={n} defaultValue={v} className={cn(input, "mt-1")} /></label>
                ))}
                <label className="text-xs font-bold text-ink/55">{L.grace}<input type="number" name="grace_minutes" min={0} max={120} defaultValue={s.grace_minutes} className={cn(input, "mt-1")} /></label>
                <label className="text-xs font-bold text-ink/55">{L.openBefore}<input type="number" name="open_before_minutes" min={0} max={240} defaultValue={s.open_before_minutes} className={cn(input, "mt-1")} /></label>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-display font-extrabold text-forest">{L.restDays}</legend>
              <div className="flex flex-wrap gap-2">
                {WEEK[km ? "km" : "en"].map((w, i) => (
                  <label key={w} className="cursor-pointer">
                    <input type="checkbox" name="rest_days" value={i} defaultChecked={s.rest_days.includes(i)} className="peer sr-only" />
                    <span className="inline-block rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ink/60 ring-1 ring-black/10 peer-checked:bg-[#1D4ED8] peer-checked:text-white peer-checked:ring-0">{w}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-2 flex items-center gap-2 font-display font-extrabold text-forest"><MapPin size={17} className="text-[#1D4ED8]" /> {L.location}</legend>
              {s.zoo_lat == null && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{L.noLoc}</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="text-xs font-bold text-ink/55">{L.lat}<input name="zoo_lat" inputMode="decimal" defaultValue={s.zoo_lat ?? ""} className={cn(input, "mt-1 font-mono")} /></label>
                <label className="text-xs font-bold text-ink/55">{L.lng}<input name="zoo_lng" inputMode="decimal" defaultValue={s.zoo_lng ?? ""} className={cn(input, "mt-1 font-mono")} /></label>
                <label className="text-xs font-bold text-ink/55">{L.radius}<input type="number" name="radius_m" min={30} max={5000} defaultValue={s.radius_m} className={cn(input, "mt-1")} /></label>
              </div>
              <GeoFill km={km} />
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink/70">
                <input type="checkbox" name="require_location" defaultChecked={s.require_location} className="h-4 w-4 accent-[#1D4ED8]" /> {L.requireLoc}
              </label>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-display font-extrabold text-forest">{L.fees}</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-ink/55">{L.lateFee}<input type="number" step="0.25" min={0} name="late_fee" defaultValue={s.late_fee} className={cn(input, "mt-1")} /></label>
                <label className="text-xs font-bold text-ink/55">{L.absFee}<input type="number" step="0.25" min={0} name="absence_fee" defaultValue={s.absence_fee} className={cn(input, "mt-1")} /></label>
                <label className="col-span-2 text-xs font-bold text-ink/55">{km ? "រាប់អវត្តមានចាប់ពីថ្ងៃ" : "Count absences from"}<input type="date" name="tracking_from" defaultValue={s.tracking_from} className={cn(input, "mt-1")} /></label>
              </div>
            </fieldset>
            <button className="w-full rounded-2xl bg-[#1D4ED8] py-3 font-extrabold text-white shadow-soft hover:bg-[#1E40AF]">{L.save}</button>
          </form>

          <div className="card space-y-3 p-5">
            <p className="flex items-center gap-2 font-display font-extrabold text-forest"><CalendarDays size={17} className="text-[#1D4ED8]" /> {L.holidays}</p>
            <form action={addHoliday} className="flex flex-wrap gap-2">
              <input type="date" name="day" required className={cn(input, "w-auto")} />
              <input name="name" required maxLength={80} placeholder={L.holName} className={cn(input, "min-w-[9rem] flex-1")} />
              <button className="rounded-xl bg-[#1D4ED8] px-4 text-sm font-bold text-white">{L.add}</button>
            </form>
            <HolidayList km={km} empty={L.noHol} />
          </div>
        </div>
      )}
    </div>
  );
}

async function HolidayList({ km, empty }: { km: boolean; empty: string }) {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient().from("staff_holidays").select("day, name").gte("day", `${localDay().slice(0, 4)}-01-01`).order("day");
  if (!data?.length) return <p className="text-sm text-ink/50">{empty}</p>;
  return (
    <ul className="divide-y divide-black/5">
      {data.map((h: any) => (
        <li key={h.day} className="flex items-center gap-3 py-2">
          <span className="w-28 flex-shrink-0 font-mono text-xs font-bold text-[#1E3A8A]">{new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${h.day}T00:00:00Z`))}</span>
          <span className="flex-1 text-sm text-ink/75">{h.name}</span>
          <form action={removeHoliday.bind(null, h.day)}>
            <button className="p-1 text-ink/35 hover:text-red-600" aria-label="remove"><Trash2 size={14} /></button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export function Legend({ km }: { km: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink/60">
      {(["ok", "late", "absent", "leave", "off", "holiday", "future"] as const).map((k) => {
        const c = cell(k, km);
        return (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded", c.cls)} /> {c.label}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5">▲ = {km ? "ព្រឹក" : "morning"} · ▼ = {km ? "រសៀល" : "afternoon"}</span>
    </div>
  );
}

/** Staff × days, each day split into morning (top) and afternoon (bottom), with totals. */
export function MonthGrid({ people, days, holidays, km, labels: L }: { people: PersonMonth[]; days: string[]; holidays: Map<string, string>; km: boolean; labels: Record<string, string> }) {
  if (!people.length) return <p className="card p-6 text-center text-sm text-ink/55">{L.none}</p>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="text-ink/50">
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-bold">{L.staff}</th>
            {days.map((d) => {
              const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
              return (
                <th key={d} className={cn("px-0.5 py-2 text-center font-bold", (wd === 0 || wd === 6) && "text-[#1D4ED8]", holidays.has(d) && "text-slate-400")} title={holidays.get(d)}>
                  {Number(d.slice(8))}
                </th>
              );
            })}
            <th className="px-2 py-2 text-center font-bold">{L.present}</th>
            <th className="px-2 py-2 text-center font-bold">{L.late}</th>
            <th className="px-2 py-2 text-center font-bold">{L.absent}</th>
            <th className="px-2 py-2 text-center font-bold">{L.leave}</th>
            <th className="px-3 py-2 text-right font-bold">{L.deduct}</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.userId} className="border-t border-black/5">
              <td className="sticky left-0 z-10 whitespace-nowrap border-t border-black/5 bg-white px-3 py-2">
                <span className="block font-bold text-forest">{p.name}</span>
                <span className="block text-[10px] text-ink/45">{p.staffNo}</span>
              </td>
              {days.map((d) => {
                const x = p.days[d];
                const a = cell(x.morning, km);
                const b = cell(x.afternoon, km);
                return (
                  <td key={d} className="border-t border-black/5 px-0.5 py-2" title={`${d} · ▲ ${a.label}${x.mIn ? ` ${x.mIn}` : ""} · ▼ ${b.label}${x.aIn ? ` ${x.aIn}` : ""}`}>
                    <span className="mx-auto flex w-4 flex-col gap-0.5">
                      <span className={cn("h-2.5 rounded-t", a.cls)} />
                      <span className={cn("h-2.5 rounded-b", b.cls)} />
                    </span>
                  </td>
                );
              })}
              <td className="border-t border-black/5 px-2 text-center font-bold text-[#1E3A8A]">{p.present}</td>
              <td className="border-t border-black/5 px-2 text-center font-bold text-amber-600">{p.late}{p.lateMinutes ? <span className="block text-[10px] font-normal text-ink/45">{p.lateMinutes}′</span> : null}</td>
              <td className="border-t border-black/5 px-2 text-center font-bold text-red-600">{p.absent}</td>
              <td className="border-t border-black/5 px-2 text-center font-bold text-violet-600">{p.leaveDays}</td>
              <td className="border-t border-black/5 px-3 text-right font-display font-extrabold text-forest">{p.deduction ? `−${usd(p.deduction)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
