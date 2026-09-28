import { CalendarCheck, CalendarPlus } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KhmerCalendarView } from "@/components/KhmerCalendarView";
import { ActionButton } from "@/components/staff/ActionButton";
import { SubmitButton } from "@/components/admin/ui-client";
import { localDay } from "@/lib/server/attendance";
import { ensureHolidays, officialDays } from "@/lib/server/holidays";
import { khNum, KH_SOLAR_MONTHS } from "@/lib/khmer-calendar";
import { toggleDayOff, addDayOff } from "../actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Khmer calendar", "ប្រតិទិនខ្មែរ");

const WD_KM = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The Khmer calendar for staff: lunar days, holidays, and the zoo's own days off. */
export default async function StaffCalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const today = localDay();
  await ensureHolidays(today).catch(() => {});
  const m = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : today.slice(0, 7);
  const [year, month] = m.split("-").map(Number);
  const db = createServiceRoleClient();
  const [{ data: zoo }, { data: skips }] = await Promise.all([
    db.from("staff_holidays").select("day, name").gte("day", `${year}-01-01`).lte("day", `${year}-12-31`),
    db.from("staff_holiday_skips").select("day, name").gte("day", `${year}-01-01`).lte("day", `${year}-12-31`),
  ]);

  // this month's days off and holidays, for the manager's list
  const official = officialDays(year);
  const zooDays = new Map((zoo ?? []).map((z: any) => [z.day as string, z.name as string]));
  const skipDays = new Set((skips ?? []).map((s: any) => s.day as string));
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const days = [...new Set([...official.keys(), ...zooDays.keys()])].filter((d) => d.startsWith(prefix)).sort();
  const rows = days.map((d) => ({ day: d, name: zooDays.get(d) ?? official.get(d) ?? "", off: zooDays.has(d), official: official.has(d), skipped: skipDays.has(d), past: d < today }));

  return (
    <StaffShell title={km ? "ប្រតិទិនខ្មែរ" : "Khmer calendar"} subtitle={km ? "ថ្ងៃចន្ទគតិ ថ្ងៃសីល ថ្ងៃបុណ្យជាតិ និងថ្ងៃឈប់របស់សួនសត្វ។" : "Lunar days, holy days, public holidays and the zoo's days off."}>
      <section className="card p-3 md:p-5">
        <KhmerCalendarView year={year} month={month} today={today} km={km} basePath="/staff/calendar" theme="blue" extra={(zoo ?? []).map((z: any) => ({ date: z.day, name: z.name }))} />
      </section>

      {manager && (
        <section className="card mt-5 space-y-4 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500"><CalendarCheck size={22} /></span>
            <div className="min-w-0">
              <p className="font-display text-base font-extrabold text-forest">{km ? `ថ្ងៃឈប់សម្រាក ខែ${KH_SOLAR_MONTHS[month - 1]}` : `Days off in ${new Date(`${prefix}-01T12:00:00Z`).toLocaleString("en-GB", { month: "long" })}`}</p>
              <p className="text-xs font-semibold text-ink/55">
                {km
                  ? "ថ្ងៃបុណ្យជាតិ ត្រូវបានដាក់ជាថ្ងៃឈប់ដោយស្វ័យប្រវត្តិ។ ចុចប៊ូតុង ដើម្បីប្តូរជាថ្ងៃធ្វើការ ឬជាថ្ងៃឈប់វិញ។ វត្តមាន និងកាលវិភាគនឹងធ្វើតាមភ្លាមៗ។"
                  : "Public holidays are days off automatically. Tap to make one a working day, or a day off again. Attendance and the schedule follow straight away."}
              </p>
            </div>
          </div>

          {rows.length ? (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl ring-1 ring-black/5">
              {rows.map((r) => {
                const wd = new Date(`${r.day}T12:00:00Z`).getUTCDay();
                return (
                  <li key={r.day} className={cn("flex flex-wrap items-center gap-3 px-3 py-3", r.past && "opacity-55")}>
                    <span className={cn("flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl leading-none", r.off ? "bg-red-50 text-red-600" : "bg-slate-100 text-ink/60")}>
                      <span className="text-[10px] font-bold">{km ? WD_KM[wd] : WD_EN[wd]}</span>
                      <span className="text-lg font-extrabold">{km ? khNum(Number(r.day.slice(8))) : Number(r.day.slice(8))}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-forest">{r.name}</p>
                      <p className={cn("text-xs font-bold", r.off ? "text-red-600" : "text-emerald-700")}>
                        {r.off ? (km ? "ថ្ងៃឈប់ · បុគ្គលិកសម្រាក" : "Day off") : km ? "ថ្ងៃធ្វើការ (អ្នកគ្រប់គ្រងបានប្តូរ)" : "Working day (changed by a manager)"}
                        {!r.official && r.off && <span className="ml-1.5 font-semibold text-ink/45">· {km ? "ថ្ងៃឈប់របស់សួនសត្វ" : "zoo's own day off"}</span>}
                      </p>
                    </div>
                    {!r.past && (
                      <ActionButton
                        action={toggleDayOff.bind(null, r.day, !r.off)}
                        label={r.off ? (km ? "ប្តូរជាថ្ងៃធ្វើការ" : "Make it a working day") : km ? "ប្តូរជាថ្ងៃឈប់" : "Make it a day off"}
                        doneLabel={km ? "បានប្តូរ" : "Changed"}
                        className={r.off ? "bg-white text-ink ring-1 ring-black/10 hover:bg-slate-50" : "bg-red-500 text-white hover:bg-red-600"}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-ink/55">{km ? "ខែនេះគ្មានថ្ងៃបុណ្យជាតិទេ។" : "No public holidays this month."}</p>
          )}

          <form action={addDayOff} className="grid gap-2 rounded-2xl bg-[#EEF2FF] p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45">{km ? "ថ្ងៃ" : "Date"}</span>
              <input type="date" name="day" required min={today} defaultValue={today.startsWith(prefix) ? today : `${prefix}-01`} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-[#1D4ED8]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45">{km ? "ឈ្មោះ / មូលហេតុ" : "Name / reason"}</span>
              <input name="name" required maxLength={80} placeholder={km ? "ឧ. ជួសជុលទ្រុង ឬពិធីជប់លៀងបុគ្គលិក" : "e.g. repairs, staff party"} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-[#1D4ED8]" />
            </label>
            <SubmitButton label={km ? "បន្ថែមថ្ងៃឈប់" : "Add day off"} pendingLabel="…" className="bg-[#1D4ED8] py-2.5 hover:bg-[#1E40AF]" />
          </form>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/45"><CalendarPlus size={14} /> {km ? "ថ្ងៃដែលបន្ថែមនឹងបង្ហាញក្នុងប្រតិទិន វត្តមាន និងកាលវិភាគ។" : "Added days show in the calendar, attendance and the schedule."}</p>
        </section>
      )}
    </StaffShell>
  );
}
