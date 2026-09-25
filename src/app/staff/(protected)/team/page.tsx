import { staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { AttendanceManager, type AttTab } from "@/components/staff/AttendanceManager";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Team attendance", "វត្តមានក្រុមការងារ");

/** Managers: today's check-ins, the month's calendar (printable) and the rules. */
export default async function TeamAttendancePage({ searchParams }: { searchParams: { at?: string; month?: string } }) {
  const km = getI18n().locale === "km";
  const tab = (["today", "month", "rules"].includes(searchParams.at ?? "") ? searchParams.at : "today") as AttTab;
  return (
    <StaffShell title={km ? "វត្តមានក្រុមការងារ" : "Team attendance"} subtitle={km ? "វេនព្រឹក និងរសៀល អ្នកមកយឺត ថ្ងៃសម្រាក និងសរុបប្រចាំខែ។" : "Morning and afternoon check-ins, late arrivals, days off and the monthly totals."}>
      <AttendanceManager tab={tab} month={searchParams.month} km={km} base="/staff/team" />
    </StaffShell>
  );
}
