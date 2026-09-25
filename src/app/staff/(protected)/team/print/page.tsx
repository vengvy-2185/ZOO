import { attendanceMonth } from "@/lib/server/attendance";
import { thisMonth, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { LogoMark } from "@/components/visitor/Logo";
import { MonthGrid, Legend } from "@/components/staff/AttendanceManager";
import { PrintButton } from "@/components/staff/PrintButton";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Attendance report", "របាយការណ៍វត្តមាន");

const WEEK = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], km: ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"] };

/** Printable monthly attendance (A4 landscape): calendar, totals, rules and signatures. */
export default async function AttendancePrint({ searchParams }: { searchParams: { month?: string } }) {
  const km = getI18n().locale === "km";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const { people, days, holidays, settings: s } = await attendanceMonth(month);
  const monthLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const printed = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const L = km
    ? { title: "របាយការណ៍វត្តមានបុគ្គលិក", print: "បោះពុម្ព", none: "មិនទាន់មានបុគ្គលិក។", staff: "បុគ្គលិក", present: "មក", late: "យឺត", absent: "អវត្តមាន", leave: "ច្បាប់", deduct: "កាត់ប្រាក់", rules: "ច្បាប់", morning: "ព្រឹក", afternoon: "រសៀល", grace: "អនុគ្រោះ", rest: "ថ្ងៃសម្រាក", lateFee: "កាត់ពេលយឺត", absFee: "កាត់ពេលអវត្តមាន", total: "សរុប", printedOn: "បោះពុម្ពនៅ", made: "រៀបចំដោយ", approved: "អនុម័តដោយ", holidays: "ថ្ងៃបុណ្យ" }
    : { title: "Staff attendance report", print: "Print", none: "No staff yet.", staff: "Staff", present: "Present", late: "Late", absent: "Absent", leave: "Leave", deduct: "Deduction", rules: "Rules", morning: "Morning", afternoon: "Afternoon", grace: "grace", rest: "Rest days", lateFee: "Per late", absFee: "Per missed session", total: "Total", printedOn: "Printed", made: "Prepared by", approved: "Approved by", holidays: "Holidays" };
  const sum = (k: "present" | "late" | "absent" | "leaveDays" | "deduction") => people.reduce((n, p) => n + p[k], 0);

  return (
    <div className="min-h-screen bg-white p-6 text-ink print:p-0">
      <style>{`@page { size: A4 landscape; margin: 10mm } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="mx-auto max-w-[1100px] space-y-4">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#1E3A8A] pb-3">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div>
              <p className="font-display text-xl font-extrabold text-[#1E3A8A]">GREEN WILD ZOO</p>
              <p className="text-sm font-bold text-ink/70">{L.title} · {monthLabel}</p>
            </div>
          </div>
          <PrintButton label={L.print} />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-[#F8FAFF] px-4 py-2 text-xs text-ink/70">
          <span><b>{L.rules}:</b> {L.morning} {s.morning_start}–{s.morning_end} · {L.afternoon} {s.afternoon_start}–{s.afternoon_end} · {L.grace} {s.grace_minutes}′</span>
          <span><b>{L.rest}:</b> {s.rest_days.length ? s.rest_days.map((d) => WEEK[km ? "km" : "en"][d]).join(", ") : "—"}</span>
          <span><b>{L.lateFee}:</b> ${s.late_fee.toFixed(2)} · <b>{L.absFee}:</b> ${s.absence_fee.toFixed(2)}</span>
          {holidays.size > 0 && <span><b>{L.holidays}:</b> {[...holidays].map(([d, n]) => `${Number(d.slice(8))} ${n}`).join(", ")}</span>}
        </div>

        <MonthGrid people={people} days={days} holidays={holidays} km={km} labels={L} />
        <Legend km={km} />

        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {[
            [L.present, sum("present")],
            [L.late, sum("late")],
            [L.absent, sum("absent")],
            [L.leave, sum("leaveDays")],
            [`${L.deduct} (${L.total})`, `$${sum("deduction").toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl border border-[#2563EB]/20 p-2">
              <p className="text-[11px] text-ink/55">{k}</p>
              <p className="font-display text-lg font-extrabold text-[#1E3A8A]">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-16 pt-10 text-sm">
          {[L.made, L.approved].map((x) => (
            <div key={x} className="text-center">
              <div className="mx-auto h-12 w-56 border-b border-ink/40" />
              <p className="mt-1 font-bold text-ink/70">{x}</p>
            </div>
          ))}
        </div>
        <p className="text-right text-[10px] text-ink/40">{L.printedOn}: {printed}</p>
      </div>
    </div>
  );
}
