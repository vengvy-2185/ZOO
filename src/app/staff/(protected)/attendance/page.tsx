import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Timer } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, monthRange, thisMonth, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";

export const dynamic = "force-dynamic";

/** Every shift this month (clock in → out), with the totals pay is worked out from. */
export const generateMetadata = () => staffTitle("Hours", "ម៉ោងធ្វើការ");

export default async function AttendancePage({ searchParams }: { searchParams: { month?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!access.staff) redirect("/staff");
  const { locale } = getI18n();
  const km = locale === "km";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const { start, end } = monthRange(month);
  const { data } = await createServiceRoleClient().from("staff_attendance").select("id, clock_in, clock_out").eq("user_id", userId).gte("clock_in", start.toISOString()).lt("clock_in", end.toISOString()).order("clock_in", { ascending: false });
  const rows = (data ?? []).map((r: any) => {
    const to = r.clock_out ? Date.parse(r.clock_out) : Date.now();
    return { ...r, hours: Math.max(0, (to - Date.parse(r.clock_in)) / 3600e3) };
  });
  const tz = { timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" } as const;
  const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const days = new Set(rows.map((r) => dayKey(r.clock_in))).size;
  const hours = rows.reduce((s, r) => s + r.hours, 0);
  const shift = (d: number) => {
    const [y, m] = month.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", ...tz }).format(new Date(iso));
  const day = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", ...tz }).format(new Date(iso));
  const L = km
    ? { title: "ម៉ោងធ្វើការរបស់ខ្ញុំ", sub: "រាល់ពេលចុះម៉ោងចូល និងចេញ។ ប្រាក់ខែគិតតាមតួលេខទាំងនេះ។", days: "ថ្ងៃធ្វើការ", hours: "ម៉ោងសរុប", shifts: "វេន", none: "មិនមានម៉ោងធ្វើការក្នុងខែនេះទេ។", now: "កំពុងធ្វើការ", h: "ម៉ោង" }
    : { title: "My working hours", sub: "Every clock-in and clock-out. Your pay is worked out from these.", days: "Days worked", hours: "Total hours", shifts: "Shifts", none: "No shifts this month.", now: "On shift", h: "h" };

  return (
    <StaffShell active="attendance" title={L.title} subtitle={L.sub}>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <Link href={`/staff/attendance?month=${shift(-1)}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] font-bold text-[#1E3A8A]">←</Link>
        <span className="font-display text-lg font-extrabold text-forest">{monthLabel}</span>
        <Link href={`/staff/attendance?month=${shift(1)}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] font-bold text-[#1E3A8A]">→</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          [CalendarDays, L.days, String(days)],
          [Timer, L.hours, hours.toFixed(1)],
          [Clock, L.shifts, String(rows.length)],
        ].map(([Icon, k, v]: any) => (
          <div key={k} className="card p-4 text-center">
            <Icon size={18} className="mx-auto text-[#1D4ED8]" />
            <p className="mt-1 font-display text-2xl font-extrabold text-forest">{v}</p>
            <p className="text-[11px] text-ink/55">{k}</p>
          </div>
        ))}
      </div>
      <div className="card divide-y divide-black/5">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink/55">{L.none}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-4">
              <span className="w-24 flex-shrink-0 text-sm font-bold text-forest">{day(r.clock_in)}</span>
              <span className="flex-1 font-mono text-sm text-ink/70">
                {time(r.clock_in)} → {r.clock_out ? time(r.clock_out) : <span className="font-sans font-bold text-emerald-600">{L.now}</span>}
              </span>
              <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-extrabold text-[#1E3A8A]">{r.hours.toFixed(1)} {L.h}</span>
            </div>
          ))
        )}
      </div>
    </StaffShell>
  );
}
