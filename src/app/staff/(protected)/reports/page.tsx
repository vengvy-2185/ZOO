import { BarChart3, DollarSign, Ticket, Users, UserCheck, CalendarOff, Clock } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { StaffShell } from "@/components/staff/StaffShell";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

/** Managers / vets: today's numbers and the last 7 days of visitors, at a glance. */
export const generateMetadata = () => staffTitle("Reports", "របាយការណ៍");

export default async function ReportsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const today = zooToday();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const from = `${days[0]}T00:00:00+07:00`;
  const [{ data: bookings }, { data: checkins }, { data: gate }, { data: onShift }, { count: pendingLeave }, { data: paidToday }] = await Promise.all([
    db.from("bookings").select("visit_date, status, total_usd").gte("visit_date", days[0]).lte("visit_date", today).neq("status", "cancelled"),
    db.from("visitor_checkins").select("checked_in_at, visitors_count").gte("checked_in_at", from),
    db.from("gate_entries").select("entry_date, count").gte("entry_date", days[0]),
    db.from("staff_attendance").select("user_id").is("clock_out", null),
    db.from("staff_leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("payments").select("amount_usd").eq("status", "paid").gte("paid_at", `${today}T00:00:00+07:00`),
  ]);
  const local = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const perDay = days.map((d) => ({
    d,
    visitors: (checkins ?? []).filter((c: any) => local(c.checked_in_at) === d).reduce((s: number, c: any) => s + (c.visitors_count ?? 0), 0) + (gate ?? []).filter((g: any) => g.entry_date === d).reduce((s: number, g: any) => s + (g.count ?? 0), 0),
    booked: (bookings ?? []).filter((b: any) => b.visit_date === d && b.status === "confirmed").length,
  }));
  const max = Math.max(1, ...perDay.map((p) => p.visitors));
  const t = perDay[perDay.length - 1];
  const revenue = (paidToday ?? []).reduce((s: number, p: any) => s + Number(p.amount_usd), 0);
  const unpaid = (bookings ?? []).filter((b: any) => b.visit_date === today && b.status === "pending").length;
  const dayName = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const L = km
    ? { title: "របាយការណ៍", sub: "តួលេខថ្ងៃនេះ និងភ្ញៀវ ៧ ថ្ងៃចុងក្រោយ។", visitors: "ភ្ញៀវចូលថ្ងៃនេះ", booked: "សំបុត្របានបង់ថ្ងៃនេះ", unpaid: "មិនទាន់បង់", revenue: "ប្រាក់ចូលថ្ងៃនេះ (KHQR)", staff: "បុគ្គលិកកំពុងធ្វើការ", leave: "សំណើច្បាប់រង់ចាំ", week: "ភ្ញៀវ ៧ ថ្ងៃចុងក្រោយ" }
    : { title: "Reports", sub: "Today's numbers and visitors over the last 7 days.", visitors: "Visitors in today", booked: "Paid tickets today", unpaid: "Not paid yet", revenue: "Taken today (KHQR)", staff: "Staff on shift", leave: "Leave requests waiting", week: "Visitors, last 7 days" };

  const tiles = [
    [Users, L.visitors, String(t.visitors)],
    [Ticket, L.booked, String(t.booked)],
    [Clock, L.unpaid, String(unpaid)],
    [DollarSign, L.revenue, `$${revenue.toFixed(2)}`],
    [UserCheck, L.staff, String((onShift ?? []).length)],
    [CalendarOff, L.leave, String(pendingLeave ?? 0)],
  ] as const;

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(([Icon, k, v], i) => (
          <div key={k} className={i === 0 ? "rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-4 text-white shadow-lift" : "card p-4"}>
            <Icon size={18} className={i === 0 ? "text-[#BFDBFE]" : "text-[#1D4ED8]"} />
            <p className="mt-2 font-display text-3xl font-extrabold">{v}</p>
            <p className={i === 0 ? "text-xs text-white/75" : "text-xs text-ink/55"}>{k}</p>
          </div>
        ))}
      </div>
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><BarChart3 size={18} className="text-[#1D4ED8]" /> {L.week}</h2>
        <div className="flex h-44 items-end gap-2 sm:gap-4">
          {perDay.map((p, i) => (
            <div key={p.d} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#1E3A8A]">{p.visitors}</span>
              <div className="w-full rounded-t-xl bg-[#EEF2FF]" style={{ height: "8rem" }}>
                <div className="flex h-full items-end">
                  <div className={i === perDay.length - 1 ? "w-full rounded-t-xl bg-[#1D4ED8]" : "w-full rounded-t-xl bg-[#93C5FD]"} style={{ height: `${Math.max(4, (p.visitors / max) * 100)}%` }} />
                </div>
              </div>
              <span className="text-[11px] font-bold text-ink/50">{dayName(p.d)}</span>
            </div>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}
