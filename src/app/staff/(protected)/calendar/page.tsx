import { CalendarCheck } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KhmerCalendarView } from "@/components/KhmerCalendarView";
import { ActionButton } from "@/components/staff/ActionButton";
import { localDay } from "@/lib/server/attendance";
import { holidaysOf, khNum } from "@/lib/khmer-calendar";
import { syncHolidays } from "../actions";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Khmer calendar", "ប្រតិទិនខ្មែរ");

/** The Khmer calendar for staff: lunar days, holidays, and the zoo's own days off. */
export default async function StaffCalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const today = localDay();
  const m = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : today.slice(0, 7);
  const [year, month] = m.split("-").map(Number);
  const { data: zoo } = await createServiceRoleClient().from("staff_holidays").select("day, name").gte("day", `${year}-01-01`).lte("day", `${year}-12-31`);
  const official = holidaysOf(year).filter((h) => h.kind === "public");
  const inZoo = new Set((zoo ?? []).map((z: any) => z.day));
  const missing = official.filter((h) => !inZoo.has(h.date)).length;
  return (
    <StaffShell title={km ? "ប្រតិទិនខ្មែរ" : "Khmer calendar"} subtitle={km ? "ថ្ងៃចន្ទគតិ ថ្ងៃសីល ថ្ងៃបុណ្យជាតិ និងថ្ងៃឈប់របស់សួនសត្វ។" : "Lunar days, holy days, public holidays and the zoo's days off."}>
      {manager && (
        <section className="card flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500"><CalendarCheck size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold text-forest">{km ? `ថ្ងៃឈប់សម្រាកឆ្នាំ ${khNum(year)} ក្នុងវត្តមាន និងកាលវិភាគ` : `${year} holidays in attendance and the schedule`}</p>
            <p className="text-xs font-semibold text-ink/55">
              {missing ? (km ? `នៅខ្វះ ${khNum(missing)} ថ្ងៃ ដែលមិនទាន់ដាក់ជាថ្ងៃឈប់` : `${missing} holiday(s) not set as days off yet`) : km ? "ថ្ងៃឈប់សម្រាកទាំងអស់បានដាក់រួចហើយ ✓" : "All holidays are set ✓"}
            </p>
          </div>
          <ActionButton
            action={syncHolidays.bind(null, year)}
            label={km ? "ដាក់ថ្ងៃបុណ្យតាមប្រតិទិន" : "Use calendar holidays"}
            doneLabel={km ? "បានដាក់" : "Done"}
            confirm={km ? `ដាក់ថ្ងៃឈប់សម្រាកឆ្នាំ ${year} តាមប្រតិទិនខ្មែរ? ថ្ងៃបុណ្យដែលដាក់ខុសពីមុននឹងត្រូវកែ ហើយកាលវិភាគពីថ្ងៃនេះទៅនឹងរៀបចំឡើងវិញ។` : `Set ${year}'s days off from the Khmer calendar? Wrong holiday days are corrected and the schedule from today is planned again.`}
            className="bg-red-500 text-white shadow-soft hover:bg-red-600"
          />
        </section>
      )}
      <KhmerCalendarView year={year} month={month} today={today} km={km} basePath="/staff/calendar" theme="blue" extra={(zoo ?? []).map((z: any) => ({ date: z.day, name: z.name }))} />
    </StaffShell>
  );
}
