import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Clock, FileText, MapPin, Monitor, MoreHorizontal, Printer, Search, Settings2, Sun, Sunset, Trash2, UserCheck, Users, XCircle } from "lucide-react";
import { attendanceMonth, localDay, localMinutes as localMinutesNow, toMin as toMinutes, type DayMark, type PersonMonth } from "@/lib/server/attendance";
import { thisMonth } from "@/lib/server/staff";
import { cn } from "@/lib/utils/cn";
import { addHoliday, markLeaveToday, markSession, removeHoliday, saveAttendanceSettings } from "@/app/staff/(protected)/attendance-actions";
import { GeoFill } from "./GeoFill";

export type AttTab = "today" | "month" | "rules";
const usd = (n: number) => `$${n.toFixed(2)}`;
const WEEK = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], km: ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"] };
const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#2563EB]";

/** Colour + label for one half-day cell. */
function cell(k: DayMark["morning"], km: boolean) {
  const M = {
    ok: { c: "bg-emerald-500", en: "Present", km: "មក" },
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
export async function AttendanceManager({ tab, month, km, base, sess, q, compact = false }: { tab: AttTab; month?: string; km: boolean; base: string; /** today: which session to focus (phones show only this one) */ sess?: string; q?: string; /** narrow column: always the card layout */ compact?: boolean }) {
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
        const all = people.map((p) => ({ p, d: p.days[today] })).filter((x) => x.d && x.d.morning !== "none");
        const qq = (q ?? "").trim().toLowerCase();
        const rows = all.filter(({ p }) => !qq || p.name.toLowerCase().includes(qq) || p.staffNo.toLowerCase().includes(qq));
        const nowSess: "morning" | "afternoon" = sess === "afternoon" || sess === "morning" ? sess : localMinutesNow() >= toMinutes(s.afternoon_start) - s.open_before_minutes ? "afternoon" : "morning";
        const dateLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date());
        const T = km
          ? { title: "បញ្ជីវត្តមាន", search: "ស្វែងរកឈ្មោះ…", name: "ឈ្មោះបុគ្គលិក", arrived: "មកដល់", late: "យឺត", leave: "ច្បាប់", absent: "អវត្តមាន", total: "សរុបថ្ងៃនេះ", staff: "សរុបបុគ្គលិក", people: "នាក់", allIn: "មកគ្រប់វេន", working: "បានមកដល់", lateIn: (x: string) => `យឺត (${x})`, absentIn: (x: string) => `អវត្តមាន (${x})`, onLeave: "ច្បាប់", waitingAll: "រង់ចាំ", off: "ថ្ងៃសម្រាក", holiday: "ថ្ងៃបុណ្យ", actions: "សកម្មភាព", markM: "✓ កត់ព្រឹក", markA: "✓ កត់រសៀល", undoM: "↺ ដកព្រឹក", undoA: "↺ ដករសៀល", giveLeave: "📝 ឲ្យច្បាប់ថ្ងៃនេះ", removeLeave: "↺ ដកច្បាប់" }
          : { title: "Attendance list", search: "Search name…", name: "Staff", arrived: "Arrived", late: "Late", leave: "Leave", absent: "Absent", total: "Today", staff: "Staff", people: "", allIn: "All sessions", working: "Arrived", lateIn: (x: string) => `Late (${x})`, absentIn: (x: string) => `Absent (${x})`, onLeave: "On leave", waitingAll: "Waiting", off: "Rest day", holiday: "Holiday", actions: "Actions", markM: "✓ Morning in", markA: "✓ Afternoon in", undoM: "↺ Undo morning", undoA: "↺ Undo afternoon", giveLeave: "📝 Leave today", removeLeave: "↺ Remove leave" };
        const sessName = (x: "morning" | "afternoon") => (x === "morning" ? L.morning : L.afternoon);
        const came = (k: DayMark["morning"]) => k === "ok" || k === "late";
        const count = (f: (k: DayMark["morning"]) => boolean) => all.reduce((c, x) => c + (f(x.d.morning) ? 1 : 0) + (f(x.d.afternoon) ? 1 : 0), 0);
        const AV = ["from-emerald-400 to-emerald-600", "from-violet-400 to-violet-600", "from-sky-400 to-blue-600", "from-amber-400 to-orange-500", "from-rose-400 to-pink-600", "from-teal-400 to-cyan-600"];

        /** one of the four boxes (arrived / late / leave / absent) for a half day */
        const box = (kind: "arrived" | "late" | "leave" | "absent", k: DayMark["morning"], time?: string, lateMin?: number) => {
          const on = kind === "arrived" ? k === "ok" : kind === "late" ? k === "late" : kind === "leave" ? k === "leave" : k === "absent";
          const style = {
            arrived: on ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-300 ring-slate-100",
            late: on ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-300 ring-slate-100",
            leave: on ? "bg-sky-50 text-sky-700 ring-sky-200" : "bg-sky-50/40 text-sky-200 ring-sky-100/60",
            absent: on ? "bg-red-50 text-red-600 ring-red-200" : "bg-red-50/40 text-red-200 ring-red-100/60",
          }[kind];
          const Icon = kind === "arrived" ? CheckCircle2 : kind === "late" ? Clock : kind === "leave" ? FileText : XCircle;
          return (
            <div className={cn("flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl ring-1", style)}>
              <Icon size={on ? 22 : 16} className={on ? (kind === "arrived" ? "fill-emerald-500 text-white" : kind === "absent" ? "fill-red-500 text-white" : "") : ""} />
              <span className="text-xs font-extrabold tabular-nums">
                {on ? (kind === "arrived" ? time : kind === "late" ? <>{time} <span className="font-bold opacity-70">+{lateMin}′</span></> : kind === "leave" ? T.leave : T.absent) : "–"}
              </span>
            </div>
          );
        };
        /** the "today" summary for a person */
        const summary = (d: DayMark) => {
          const ks = [d.morning, d.afternoon];
          const work = ks.filter((k) => !["off", "holiday", "none"].includes(k)).length;
          const n = ks.filter(came).length;
          const which = (f: (k: DayMark["morning"]) => boolean) => (["morning", "afternoon"] as const).filter((x) => f(d[x])).map(sessName).join(", ");
          if (d.morning === "holiday") return { cls: "bg-slate-100 text-slate-600", Icon: CalendarDays, text: T.holiday, n: "" };
          if (d.morning === "off") return { cls: "bg-slate-100 text-slate-600", Icon: CalendarDays, text: T.off, n: "" };
          if (ks.includes("absent")) return { cls: "bg-red-50 text-red-700", Icon: XCircle, text: T.absentIn(which((k) => k === "absent")), n: `${n}/${work}` };
          if (ks.includes("late")) return { cls: "bg-amber-50 text-amber-800", Icon: Clock, text: T.lateIn(which((k) => k === "late")), n: `${n}/${work}` };
          if (ks.includes("leave")) return { cls: "bg-sky-50 text-sky-700", Icon: FileText, text: T.onLeave, n: "" };
          if (n === work && work > 0) return { cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2, text: T.allIn, n: `${n}/${work}` };
          if (n > 0) return { cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2, text: T.working, n: `${n}/${work}` };
          return { cls: "bg-slate-50 text-slate-500", Icon: Clock, text: T.waitingAll, n: `0/${work}` };
        };
        const menu = (p: PersonMonth, d: DayMark) => {
          const onLeave = d.morning === "leave";
          return (
            <details className="group relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl bg-[#F1F5FF] text-[#1E3A8A] ring-1 ring-[#2563EB]/10 hover:bg-[#E0E7FF]" aria-label={T.actions}>
                <MoreHorizontal size={18} />
              </summary>
              <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-black/5">
                {(["morning", "afternoon"] as const).map((x) => {
                  const done = came(d[x]);
                  const can = done || !["leave", "off", "holiday"].includes(d[x]);
                  if (!can) return null;
                  return (
                    <form key={x} action={markSession.bind(null, p.userId, today, x, !done)}>
                      <button className={cn("w-full rounded-xl px-3 py-2 text-left text-sm font-bold", done ? "text-ink/60 hover:bg-red-50 hover:text-red-600" : "text-emerald-700 hover:bg-emerald-50")}>
                        {x === "morning" ? (done ? T.undoM : T.markM) : done ? T.undoA : T.markA}
                      </button>
                    </form>
                  );
                })}
                <form action={markLeaveToday.bind(null, p.userId, today, !onLeave)}>
                  <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-sky-700 hover:bg-sky-50">{onLeave ? T.removeLeave : T.giveLeave}</button>
                </form>
              </div>
            </details>
          );
        };
        const avatar = (p: PersonMonth, i: number, size = "h-14 w-14 text-2xl") =>
          p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="" className={cn(size, "flex-shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-soft")} />
          ) : (
            <span className={cn(size, "flex flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display font-extrabold text-white shadow-soft", AV[i % AV.length])}>{[...p.name][0]?.toUpperCase()}</span>
          );
        const SessHead = ({ x }: { x: "morning" | "afternoon" }) => (
          <div className={cn("rounded-2xl px-2 pb-2 pt-3", nowSess === x && "bg-white/70 ring-1 ring-[#2563EB]/15")}>
            <p className="mb-2 flex items-center justify-center gap-2 font-display font-extrabold text-[#1E3A8A]">
              {x === "morning" ? <Sun size={20} className="text-amber-500" /> : <Sunset size={20} className="text-orange-500" />}
              {sessName(x)} <span className="text-xs font-bold text-ink/45">({x === "morning" ? `${s.morning_start} - ${s.morning_end}` : `${s.afternoon_start} - ${s.afternoon_end}`})</span>
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-ink/60">
              <span><CheckCircle2 size={13} className="-mt-0.5 mr-0.5 inline text-emerald-600" />{T.arrived}</span>
              <span><Clock size={13} className="-mt-0.5 mr-0.5 inline text-amber-600" />{T.late}</span>
              <span><FileText size={13} className="-mt-0.5 mr-0.5 inline text-sky-600" />{T.leave}</span>
              <span><XCircle size={13} className="-mt-0.5 mr-0.5 inline text-red-500" />{T.absent}</span>
            </div>
          </div>
        );
        const qs = (o: Record<string, string>) => href({ at: "today", ...(q ? { q } : {}), ...(sess ? { sess } : {}), ...o });

        return (
          <div className="space-y-3">
            {/* header: title · date · morning/afternoon · search */}
            <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] bg-white p-2.5 shadow-soft ring-1 ring-black/5">
              <div className="flex items-center gap-3 rounded-[1.4rem] bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] py-2.5 pl-4 pr-8 text-white [clip-path:polygon(0_0,100%_0,calc(100%-1.25rem)_100%,0_100%)]">
                <Users size={26} />
                <span className="font-display text-xl font-extrabold">{T.title}</span>
              </div>
              <span className="flex items-center gap-2 text-sm font-bold text-[#1E3A8A]"><CalendarDays size={18} className="text-[#1D4ED8]" /> {dateLabel}</span>
              <div className="ml-auto flex rounded-full bg-[#F1F5FF] p-1">
                {(["morning", "afternoon"] as const).map((x) => (
                  <Link key={x} href={qs({ sess: x })} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-extrabold transition", nowSess === x ? "bg-[#1D4ED8] text-white shadow-soft" : "text-[#1E3A8A] hover:bg-white")}>
                    {x === "morning" ? <Sun size={16} className={nowSess === x ? "text-amber-300" : "text-amber-500"} /> : <Sunset size={16} className={nowSess === x ? "text-orange-300" : "text-orange-500"} />} {sessName(x)}
                  </Link>
                ))}
              </div>
              <form action={base.split("?")[0]} className="relative w-full sm:w-56">
                {base.includes("?") && base.split("?")[1].split("&").map((kv) => { const [k, v] = kv.split("="); return <input key={k} type="hidden" name={k} value={decodeURIComponent(v ?? "")} />; })}
                <input type="hidden" name="at" value="today" />
                {sess && <input type="hidden" name="sess" value={sess} />}
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
                <input name="q" defaultValue={q} placeholder={T.search} className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-[#2563EB]" />
              </form>
            </div>

            {/* the table (computers) */}
            <div className={cn("hidden rounded-[1.75rem] bg-[#F1F5FF] p-2 ring-1 ring-[#2563EB]/10", !compact && "xl:block")}>
              <div className="grid grid-cols-[2.25rem_minmax(11rem,1.1fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(8.5rem,0.9fr)_2.5rem] items-end gap-3 px-2">
                <span className="pb-3 text-center font-bold text-ink/50">#</span>
                <span className="flex items-center gap-2 pb-3 font-display font-extrabold text-[#1E3A8A]"><Users size={18} /> {T.name}</span>
                <SessHead x="morning" />
                <SessHead x="afternoon" />
                <span className="flex items-center justify-center gap-1.5 pb-3 font-display font-extrabold text-[#1E3A8A]"><BarChart3 size={18} className="text-[#1D4ED8]" /> {T.total}</span>
                <span />
              </div>
              <div className="mt-2 space-y-2">
                {rows.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink/55">{L.none}</p>}
                {rows.map(({ p, d }, i) => {
                  const sm = summary(d);
                  return (
                    <div key={p.userId} className="grid grid-cols-[2.25rem_minmax(11rem,1.1fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(8.5rem,0.9fr)_2.5rem] items-center gap-3 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-black/5">
                      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5FF] text-sm font-bold text-[#1E3A8A]">{i + 1}</span>
                      <div className="flex min-w-0 items-center gap-3">
                        {avatar(p, i)}
                        <span className="min-w-0">
                          <span className="block truncate font-display font-extrabold text-forest">{p.name}</span>
                          <span className="block truncate text-xs text-ink/50">{p.staffNo} · {(km && p.positionKm) || p.position}</span>
                        </span>
                      </div>
                      {(["morning", "afternoon"] as const).map((x) => (
                        <div key={x} className={cn("grid grid-cols-4 gap-2 rounded-2xl p-1", nowSess === x && "bg-[#F8FAFF]")}>
                          {box("arrived", d[x], x === "morning" ? d.mIn : d.aIn)}
                          {box("late", d[x], x === "morning" ? d.mIn : d.aIn, x === "morning" ? d.mLate : d.aLate)}
                          {box("leave", d[x])}
                          {box("absent", d[x])}
                        </div>
                      ))}
                      <div className={cn("flex h-16 items-center gap-2 rounded-2xl px-3", sm.cls)}>
                        <sm.Icon size={26} className="flex-shrink-0" />
                        <span className="min-w-0 text-xs font-extrabold leading-tight">
                          {sm.text}
                          {sm.n && <span className="block text-sm">{sm.n}</span>}
                        </span>
                      </div>
                      {menu(p, d)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* cards (phones, tablets, narrow columns): the chosen session */}
            <div className={cn("space-y-2", !compact && "xl:hidden")}>
              {rows.length === 0 && <p className="card p-6 text-center text-sm text-ink/55">{L.none}</p>}
              {rows.map(({ p, d }, i) => {
                const sm = summary(d);
                return (
                  <div key={p.userId} className="card space-y-2.5 p-3">
                    <div className="flex items-center gap-3">
                      {avatar(p, i, "h-12 w-12 text-xl")}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-extrabold text-forest">{p.name}</span>
                        <span className="block truncate text-xs text-ink/50">{p.staffNo} · {(km && p.positionKm) || p.position}</span>
                      </span>
                      <span className={cn("hidden rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold sm:block", sm.cls)}>{sm.text} {sm.n}</span>
                      {menu(p, d)}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A]">
                      {nowSess === "morning" ? <Sun size={14} className="text-amber-500" /> : <Sunset size={14} className="text-orange-500" />} {sessName(nowSess)}
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {box("arrived", d[nowSess], nowSess === "morning" ? d.mIn : d.aIn)}
                      {box("late", d[nowSess], nowSess === "morning" ? d.mIn : d.aIn, nowSess === "morning" ? d.mLate : d.aLate)}
                      {box("leave", d[nowSess])}
                      {box("absent", d[nowSess])}
                    </div>
                    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold sm:hidden", sm.cls)}>
                      <sm.Icon size={16} /> {sm.text} {sm.n && <span className="ml-auto">{sm.n}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* legend + totals */}
            <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] bg-white p-2.5 shadow-soft ring-1 ring-black/5">
              {[
                [CheckCircle2, T.arrived, "bg-emerald-50 text-emerald-700"],
                [Clock, T.late, "bg-amber-50 text-amber-800"],
                [FileText, T.leave, "bg-sky-50 text-sky-700"],
                [XCircle, T.absent, "bg-red-50 text-red-600"],
              ].map(([Icon, label, cls]: any) => (
                <span key={label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold", cls)}><Icon size={16} /> {label}</span>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-[#F1F5FF] px-4 py-2 text-sm font-bold">
                <span className="text-[#1E3A8A]"><Users size={16} className="-mt-0.5 mr-1 inline" />{T.staff}: {all.length} {T.people}</span>
                <span className="text-emerald-700">{T.arrived}: {count(came)}</span>
                <span className="text-amber-700">{T.late}: {count((k) => k === "late")}</span>
                <span className="text-sky-700">{T.leave}: {all.filter((x) => x.d.morning === "leave").length}</span>
                <span className="text-red-600">{T.absent}: {count((k) => k === "absent")}</span>
              </div>
            </div>
          </div>
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
              <td className="border-t border-black/5 px-2 text-center font-bold text-emerald-600">{p.present}</td>
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
