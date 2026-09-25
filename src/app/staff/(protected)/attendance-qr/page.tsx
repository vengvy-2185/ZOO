import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffTitle } from "@/lib/server/staff";
import { getAttendanceSettings, localDay, toMin, weekday } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KioskQR, type KioskWindow } from "@/components/staff/KioskQR";
import { AttendanceManager } from "@/components/staff/AttendanceManager";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Attendance QR", "QR វត្តមាន");

/** The screen at the staff entrance: the QR opens full screen by itself at check-in time. */
export default async function AttendanceQrPage() {
  const km = getI18n().locale === "km";
  const s = await getAttendanceSettings();
  const day = localDay();
  const { data: hol } = await createServiceRoleClient().from("staff_holidays").select("name").eq("day", day).maybeSingle();
  const WEEK = km ? ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOff = hol?.name ?? (s.rest_days.includes(weekday(day)) ? WEEK[weekday(day)] : null);
  const windows: KioskWindow[] = [
    { session: "morning", openMin: toMin(s.morning_start) - s.open_before_minutes, startMin: toMin(s.morning_start), graceMin: s.grace_minutes, endMin: toMin(s.morning_end) },
    { session: "afternoon", openMin: toMin(s.afternoon_start) - s.open_before_minutes, startMin: toMin(s.afternoon_start), graceMin: s.grace_minutes, endMin: toMin(s.afternoon_end) },
  ];
  return (
    <StaffShell title={km ? "QR វត្តមាន" : "Attendance QR"} subtitle={km ? "ទុកទំព័រនេះបើកនៅច្រកចូលបុគ្គលិក។ ដល់ម៉ោង QR បើកពេញអេក្រង់ដោយខ្លួនឯង ហើយបិទវិញពេលអស់ម៉ោង។" : "Leave this open at the staff entrance. At check-in time the QR opens full screen by itself and closes when the session ends."}>
      <div className="grid items-start gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <KioskQR km={km} windows={windows} dayOff={dayOff} />
        <AttendanceManager tab="today" km={km} base="/staff/team" />
      </div>
    </StaffShell>
  );
}
