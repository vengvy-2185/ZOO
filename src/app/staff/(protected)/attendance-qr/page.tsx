import { staffTitle } from "@/lib/server/staff";
import { getAttendanceSettings, sessionFor } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KioskQR } from "@/components/staff/KioskQR";
import { AttendanceManager } from "@/components/staff/AttendanceManager";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Attendance QR", "QR វត្តមាន");

/** The screen at the staff entrance: rolling QR + who has checked in today (updates by itself). */
export default async function AttendanceQrPage() {
  const km = getI18n().locale === "km";
  const s = await getAttendanceSettings();
  const now = sessionFor(s);
  const label = now ? (now.session === "morning" ? (km ? `វេនព្រឹក · ${s.morning_start}` : `Morning · ${s.morning_start}`) : km ? `វេនរសៀល · ${s.afternoon_start}` : `Afternoon · ${s.afternoon_start}`) : km ? "ក្រៅម៉ោងកត់វត្តមាន" : "Outside check-in hours";
  return (
    <StaffShell title={km ? "QR វត្តមាន" : "Attendance QR"} subtitle={km ? "ដាក់អេក្រង់នេះនៅច្រកចូលបុគ្គលិក។ QR ប្តូររៀងរាល់នាទី ដូច្នេះថតរូបយកទៅស្កេនពីផ្ទះមិនបានទេ។" : "Show this at the staff entrance. The QR changes every minute, so a photo of it can't be used from home."}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <KioskQR km={km} sessionLabel={label} />
        <AttendanceManager tab="today" km={km} base="/staff/team" />
      </div>
    </StaffShell>
  );
}
