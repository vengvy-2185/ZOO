import { staffTitle } from "@/lib/server/staff";
import { kioskSchedule } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KioskQR } from "@/components/staff/KioskQR";
import { AttendanceManager } from "@/components/staff/AttendanceManager";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Attendance QR", "QR វត្តមាន");

/** The screen at the staff entrance: the QR opens full screen by itself at check-in time. */
export default async function AttendanceQrPage() {
  const km = getI18n().locale === "km";
  const { windows, dayOff } = await kioskSchedule(km);
  return (
    <StaffShell title={km ? "QR វត្តមាន" : "Attendance QR"} subtitle={km ? "ទុកទំព័រនេះបើកនៅច្រកចូលបុគ្គលិក។ ដល់ម៉ោង QR បើកពេញអេក្រង់ដោយខ្លួនឯង ហើយបិទវិញពេលអស់ម៉ោង។" : "Leave this open at the staff entrance. At check-in time the QR opens full screen by itself and closes when the session ends."}>
      <div className="grid items-start gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <KioskQR km={km} windows={windows} dayOff={dayOff} />
        <AttendanceManager tab="today" km={km} base="/staff/team" compact />
      </div>
    </StaffShell>
  );
}
