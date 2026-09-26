import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlarmClock, XCircle, CalendarOff, Timer, ChevronLeft, ChevronRight, Sun, Sunset, Wallet } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, monthRange, thisMonth, staffTitle } from "@/lib/server/staff";
import { attendanceMonth, localDay, type DayMark } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("My attendance", "វត្តមានខ្ញុំ");

type Mark = DayMark["morning"];
const MARK: Record<Mark, { en: string; km: string; cls: string; dot: string }> = {
  ok: { en: "On time", km: "ទាន់ម៉ោង", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  late: { en: "Late", km: "យឺត", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  absent: { en: "Absent", km: "អវត្តមាន", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
  leave: { en: "Leave", km: "ច្បាប់", cls: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  off: { en: "Day off", km: "ថ្ងៃឈប់", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
  holiday: { en: "Holiday", km: "បុណ្យ", cls: "bg-sky-100 text-sky-700", dot: "bg-sky-400" },
  future: { en: "—", km: "—", cls: "bg-white text-ink/25 ring-1 ring-black/5", dot: "bg-slate-200" },
  none: { en: "—", km: "—", cls: "bg-white text-ink/25 ring-1 ring-black/5", dot: "bg-slate-100" },
};

/** My own attendance: every morning / afternoon this month, big and clear, plus working hours. */
export default async function AttendancePage({ searchParams }: { searchParams: { month?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!access.staff) redirect("/staff");
  const { locale } = getI18n();
  const km = locale === "km";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const { start, end } = monthRange(month);
  const [{ people }, { data: shifts }] = await Promise.all([
    attendanceMonth(month, userId),
    createServiceRoleClient().from("staff_attendance").select("id, clock_in, clock_out").eq("user_id", userId).gte("clock_in", start.toISOString()).lt("clock_in", end.toISOString()).order("clock_in", { ascending: false }),
  ]);
  const me = people[0];
  const today = localDay();
  const hours = (shifts ?? []).reduce((n: number, r: any) => n + Math.max(0, ((r.clock_out ? Date.parse(r.clock_out) : Date.now()) - Date.parse(r.clock_in)) / 3600e3), 0);
  const shift = (d: number) => {
    const [y, m] = month.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const [y, m] = month.split("-").map(Number);
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const allDays = Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const dayLong = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${d}T12:00:00Z`));
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "វត្តមានរបស់ខ្ញុំ", sub: "ពេលព្រឹក និងពេលរសៀល រៀងរាល់ថ្ងៃ។ ពណ៌បៃតង = ទាន់ម៉ោង, លឿង = យឺត, ក្រហម = អវត្តមាន។", present: "មកធ្វើការ", late: "មកយឺត", absent: "អវត្តមាន", leave: "ច្បាប់ (ថ្ងៃ)", deduct: "កាត់ប្រាក់", minutes: "នាទី", times: "ដង", morning: "ព្រឹក", afternoon: "រសៀល", days: "ប្រចាំថ្ងៃ", hours: "ម៉ោងធ្វើការ", total: "ម៉ោងសរុប", now: "កំពុងធ្វើការ", none: "មិនទាន់មានទិន្នន័យ", lateBy: (n: number) => `យឺត ${n} នាទី` }
    : { title: "My attendance", sub: "Every morning and afternoon. Green = on time, yellow = late, red = absent.", present: "Present", late: "Late", absent: "Absent", leave: "Leave (days)", deduct: "Deducted", minutes: "min", times: "times", morning: "Morning", afternoon: "Afternoon", days: "Day by day", hours: "Working hours", total: "Total hours", now: "On shift", none: "Nothing yet", lateBy: (n: number) => `${n} min late` };
  const tiles = [
    { Icon: CheckCircle2, k: L.present, v: me?.present ?? 0, sub: L.times, c: "from-emerald-500 to-emerald-700" },
    { Icon: AlarmClock, k: L.late, v: me?.late ?? 0, sub: `${me?.lateMinutes ?? 0} ${L.minutes}`, c: "from-amber-400 to-orange-600" },
    { Icon: XCircle, k: L.absent, v: me?.absent ?? 0, sub: L.times, c: "from-rose-500 to-red-700" },
    { Icon: CalendarOff, k: L.leave, v: me?.leaveDays ?? 0, sub: "", c: "from-violet-500 to-purple-700" },
  ];
  const worked = allDays.filter((d) => d <= today && me?.days[d] && ["ok", "late", "absent", "leave"].some((x) => me.days[d].morning === x || me.days[d].afternoon === x)).reverse();

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="card flex items-center justify-between gap-3 p-3">
        <Link href={`/staff/attendance?month=${shift(-1)}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]" aria-label="previous"><ChevronLeft size={22} /></Link>
        <span className="font-display text-xl font-extrabold text-forest md:text-2xl">{monthLabel}</span>
        <Link href={`/staff/attendance?month=${shift(1)}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]" aria-label="next"><ChevronRight size={22} /></Link>
      </div>

      {/* big numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.k} className={`relative animate-[gwzPop_.4s_ease-out_both] overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white shadow-soft md:p-5 ${t.c}`} style={{ animationDelay: `${i * 60}ms` }}>
            <t.Icon size={80} className="pointer-events-none absolute -bottom-3 -right-3 text-white/15" />
            <p className="text-base font-bold text-white/90">{t.k}</p>
            <p className="mt-1 font-display text-5xl font-extrabold leading-none">{t.v}</p>
            {t.sub && <p className="mt-1 text-sm font-semibold text-white/85">{t.sub}</p>}
          </div>
        ))}
      </div>
      {(me?.deduction ?? 0) > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-base font-bold text-red-700 ring-1 ring-red-100"><Wallet size={18} /> {L.deduct}: ${me!.deduction.toFixed(2)}</p>
      )}

      {/* calendar */}
      <section className="card p-3 md:p-5">
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {weekdays.map((w) => <p key={w} className="pb-1 text-center text-xs font-bold text-ink/45 md:text-sm">{w}</p>)}
          {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
          {allDays.map((d) => {
            const mk = me?.days[d];
            const isToday = d === today;
            return (
              <div key={d} className={cn("flex flex-col items-center gap-1 rounded-2xl p-1.5 md:p-2", isToday ? "bg-[#EEF2FF] ring-2 ring-[#3B82F6]" : "bg-slate-50/70")}>
                <span className={cn("font-display text-lg font-extrabold leading-none md:text-xl", isToday ? "text-[#1D4ED8]" : "text-forest")}>{Number(d.slice(8))}</span>
                <span className="flex w-full flex-col gap-0.5">
                  {(["morning", "afternoon"] as const).map((sess) => {
                    const v = (mk?.[sess] ?? "none") as Mark;
                    return <span key={sess} className={cn("h-2 w-full rounded-full md:h-2.5", MARK[v].dot)} title={`${sess === "morning" ? L.morning : L.afternoon}: ${km ? MARK[v].km : MARK[v].en}`} />;
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-ink/65">
          {(["ok", "late", "absent", "leave", "off", "holiday"] as Mark[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-full", MARK[k].dot)} /> {km ? MARK[k].km : MARK[k].en}</span>
          ))}
          <span className="text-ink/40">· {km ? "ខាងលើ = ព្រឹក, ខាងក្រោម = រសៀល" : "top = morning, bottom = afternoon"}</span>
        </div>
      </section>

      {/* day by day */}
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.days}</h2>
        <div className="space-y-2">
          {worked.length === 0 && <p className="card p-6 text-center text-base text-ink/55">{L.none}</p>}
          {worked.map((d) => {
            const mk = me!.days[d];
            return (
              <div key={d} className="card flex flex-wrap items-center gap-3 p-4">
                <p className="min-w-[11rem] flex-1 font-display text-lg font-extrabold text-forest">{dayLong(d)}</p>
                {(["morning", "afternoon"] as const).map((sess) => {
                  const v = mk[sess] as Mark;
                  const at = sess === "morning" ? mk.mIn : mk.aIn;
                  const late = sess === "morning" ? mk.mLate : mk.aLate;
                  return (
                    <span key={sess} className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-base font-bold", MARK[v].cls)}>
                      {sess === "morning" ? <Sun size={18} /> : <Sunset size={18} />}
                      {km ? MARK[v].km : MARK[v].en}
                      {at && <span className="font-mono text-sm opacity-80">{at}</span>}
                      {v === "late" && late ? <span className="text-sm opacity-80">({L.lateBy(late)})</span> : null}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* working hours */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Timer size={20} className="text-[#1D4ED8]" /> {L.hours}</h2>
          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-base font-extrabold text-[#1E3A8A]">{L.total}: {hours.toFixed(1)}h</span>
        </div>
        <div className="divide-y divide-black/5">
          {(shifts ?? []).length === 0 && <p className="py-4 text-center text-base text-ink/55">{L.none}</p>}
          {(shifts ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <span className="flex-1 text-base font-bold text-forest">{new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(r.clock_in))}</span>
              <span className="font-mono text-base text-ink/70">{time(r.clock_in)} → {r.clock_out ? time(r.clock_out) : <span className="font-sans font-bold text-emerald-600">{L.now}</span>}</span>
            </div>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}
