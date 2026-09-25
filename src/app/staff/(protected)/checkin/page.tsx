import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffTitle } from "@/lib/server/staff";
import { getAttendanceSettings, localDay } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { CheckInScanner } from "@/components/staff/CheckInScanner";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Check in", "ស្កេនវត្តមាន");

/** Staff scan the QR on the zoo's screen (location on) to check in for the morning or afternoon. */
export default async function CheckInPage({ searchParams }: { searchParams: { t?: string } }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const s = await getAttendanceSettings();
  const { data: mine } = await createServiceRoleClient().from("staff_session_checks").select("session, checked_at, late_minutes").eq("user_id", userId).eq("day", localDay());
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const L = km
    ? { title: "ស្កេនវត្តមាន", sub: "បើក Location រួចស្កេន QR នៅលើអេក្រង់នៅសួនសត្វ។ QR ប្តូររៀងរាល់នាទី។", morning: "វេនព្រឹក", afternoon: "វេនរសៀល", waiting: "មិនទាន់ស្កេន", late: (m: number) => `យឺត ${m} នាទី`, onTime: "ទាន់ម៉ោង", grace: (g: number) => `អនុគ្រោះ ${g} នាទី` }
    : { title: "Check in", sub: "Turn on Location, then scan the QR on the zoo's screen. It changes every minute.", morning: "Morning", afternoon: "Afternoon", waiting: "Not scanned yet", late: (m: number) => `${m} min late`, onTime: "On time", grace: (g: number) => `${g} min grace` };
  const row = (sess: "morning" | "afternoon", start: string, end: string) => {
    const c: any = (mine ?? []).find((x: any) => x.session === sess);
    return (
      <div key={sess} className={`card flex items-center gap-3 p-4 ${c ? (c.late_minutes ? "ring-2 ring-amber-300" : "ring-2 ring-emerald-300") : ""}`}>
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${c ? (c.late_minutes ? "bg-amber-100 text-amber-600" : "bg-emerald-500 text-white") : "bg-[#EEF2FF] text-[#1D4ED8]"}`}>
          {c ? (c.late_minutes ? <Clock size={20} /> : <CheckCircle2 size={20} />) : <Clock size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-forest">{sess === "morning" ? L.morning : L.afternoon}</span>
          <span className="block text-xs text-ink/55">{start}–{end} · {L.grace(s.grace_minutes)}</span>
        </span>
        <span className={`text-right text-sm font-extrabold ${c ? (c.late_minutes ? "text-amber-600" : "text-emerald-600") : "text-ink/40"}`}>
          {c ? <>{time(c.checked_at)}<span className="block text-[11px]">{c.late_minutes ? L.late(c.late_minutes) : L.onTime}</span></> : L.waiting}
        </span>
      </div>
    );
  };
  return (
    <StaffShell title={L.title} subtitle={L.sub} hero={<p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><MapPin size={13} /> Location</p>}>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1fr]">
        <CheckInScanner km={km} initialToken={searchParams.t} />
        <div className="space-y-3">
          {row("morning", s.morning_start, s.morning_end)}
          {row("afternoon", s.afternoon_start, s.afternoon_end)}
        </div>
      </div>
    </StaffShell>
  );
}
