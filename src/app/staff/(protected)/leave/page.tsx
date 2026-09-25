import { redirect } from "next/navigation";
import { CalendarOff, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { StaffShell } from "@/components/staff/StaffShell";
import { LeaveForm } from "@/components/staff/StaffForms";
import { cancelLeave } from "../actions";

export const dynamic = "force-dynamic";

const STATUS = {
  pending: { icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-200", en: "Waiting", km: "កំពុងរង់ចាំ" },
  approved: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", en: "Approved", km: "បានអនុញ្ញាត" },
  rejected: { icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-200", en: "Not approved", km: "មិនអនុញ្ញាត" },
  cancelled: { icon: Ban, cls: "bg-black/5 text-ink/50 ring-black/10", en: "Cancelled", km: "បានបោះបង់" },
} as const;
const KIND = { annual: { en: "Annual leave", km: "ច្បាប់ប្រចាំឆ្នាំ" }, sick: { en: "Sick", km: "ឈឺ" }, personal: { en: "Personal", km: "កិច្ចការផ្ទាល់ខ្លួន" }, other: { en: "Other", km: "ផ្សេងៗ" } } as const;

/** Ask for time off and follow what the admin decided. */
export default async function LeavePage() {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!access.staff) redirect("/staff");
  const { locale } = getI18n();
  const km = locale === "km";
  const { data } = await createServiceRoleClient().from("staff_leave_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  const d = (s: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${s}T00:00:00Z`));
  const nDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
  const approvedDays = (data ?? []).filter((r: any) => r.status === "approved" && r.start_date.slice(0, 4) === zooToday().slice(0, 4)).reduce((s: number, r: any) => s + nDays(r.start_date, r.end_date), 0);
  const L = km
    ? { title: "សុំច្បាប់", sub: "ស្នើសុំឈប់សម្រាក ហើយតាមដានការសម្រេចរបស់អ្នកគ្រប់គ្រង។", ask: "សំណើថ្មី", mine: "សំណើរបស់ខ្ញុំ", none: "មិនទាន់មានសំណើទេ។", days: "ថ្ងៃ", cancel: "បោះបង់", used: "ច្បាប់បានអនុញ្ញាតឆ្នាំនេះ", note: "អ្នកគ្រប់គ្រង៖" }
    : { title: "Leave", sub: "Ask for time off and follow what the admin decides.", ask: "New request", mine: "My requests", none: "No requests yet.", days: "days", cancel: "Cancel", used: "Approved leave this year", note: "Admin:" };

  return (
    <StaffShell
      active="leave"
      title={L.title}
      subtitle={L.sub}
      hero={<p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold ring-1 ring-white/20"><CalendarOff size={15} /> {L.used}: {approvedDays} {L.days}</p>}
    >
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.ask}</h2>
          <LeaveForm km={km} today={zooToday()} />
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.mine}</h2>
          <div className="space-y-2">
            {(data ?? []).length === 0 && <p className="card p-6 text-center text-sm text-ink/55">{L.none}</p>}
            {(data ?? []).map((r: any) => {
              const S = STATUS[r.status as keyof typeof STATUS] ?? STATUS.pending;
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-extrabold text-forest">{km ? KIND[r.kind as keyof typeof KIND]?.km : KIND[r.kind as keyof typeof KIND]?.en}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${S.cls}`}><S.icon size={13} /> {km ? S.km : S.en}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink/70">
                    {d(r.start_date)}{r.end_date !== r.start_date && ` → ${d(r.end_date)}`} · {nDays(r.start_date, r.end_date)} {L.days}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">{r.reason}</p>
                  {r.admin_note && <p className="mt-2 rounded-xl bg-[#EEF2FF] px-3 py-2 text-xs text-[#1E3A8A]"><b>{L.note}</b> {r.admin_note}</p>}
                  {r.status === "pending" && (
                    <form action={cancelLeave.bind(null, r.id)} className="mt-2 flex justify-end">
                      <button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink/50 ring-1 ring-black/10 hover:text-red-600">{L.cancel}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
