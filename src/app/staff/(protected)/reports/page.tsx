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

  // each number with its own soft colour; the first one stands out
  const tiles = [
    { Icon: Users, k: L.visitors, v: String(t.visitors), c: "from-[#1E3A8A] to-[#3B82F6]", icon: "bg-white/20 text-white", hero: true },
    { Icon: Ticket, k: L.booked, v: String(t.booked), c: "from-emerald-50 to-emerald-100", icon: "bg-emerald-500 text-white", num: "text-emerald-700" },
    { Icon: Clock, k: L.unpaid, v: String(unpaid), c: "from-amber-50 to-orange-100", icon: "bg-amber-500 text-white", num: "text-amber-700" },
    { Icon: DollarSign, k: L.revenue, v: `$${revenue.toFixed(2)}`, c: "from-violet-50 to-indigo-100", icon: "bg-violet-500 text-white", num: "text-violet-700" },
    { Icon: UserCheck, k: L.staff, v: String((onShift ?? []).length), c: "from-teal-50 to-cyan-100", icon: "bg-teal-500 text-white", num: "text-teal-700" },
    { Icon: CalendarOff, k: L.leave, v: String(pendingLeave ?? 0), c: "from-rose-50 to-pink-100", icon: "bg-rose-500 text-white", num: "text-rose-600" },
  ];
  const total = perDay.reduce((n, p) => n + p.visitors, 0);
  const lines = [1, 0.75, 0.5, 0.25];

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.k} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 shadow-soft ring-1 ring-black/5 md:p-5 ${x.c} ${x.hero ? "text-white shadow-lift" : ""}`}>
            <svg viewBox="0 0 100 100" className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 ${x.hero ? "text-white opacity-10" : `${x.num} opacity-[0.12]`}`} aria-hidden><circle cx="50" cy="50" r="50" fill="currentColor" /></svg>
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${x.icon}`}><x.Icon size={20} /></span>
            <p className={`mt-3 font-display text-3xl font-extrabold leading-none md:text-4xl ${x.hero ? "" : x.num}`}>{x.v}</p>
            <p className={`mt-1.5 text-xs font-bold ${x.hero ? "text-white/80" : "text-ink/60"}`}>{x.k}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]"><BarChart3 size={18} /></span> {L.week}
          </h2>
          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-extrabold text-[#1E3A8A]">{L.visitors.split(" ")[0]} · {total}</span>
        </div>
        <div className="relative">
          {/* grid lines */}
          <div className="pointer-events-none absolute inset-x-0 top-6 h-40">
            {lines.map((l) => (
              <div key={l} className="absolute inset-x-0 border-t border-dashed border-black/[0.06]" style={{ top: `${(1 - l) * 100}%` }}>
                <span className="absolute -top-2.5 left-0 bg-white pr-1 text-[10px] font-bold text-ink/30">{Math.round(max * l)}</span>
              </div>
            ))}
          </div>
          <div className="relative flex items-end gap-2 pl-6 sm:gap-4">
            {perDay.map((p, i) => {
              const today = i === perDay.length - 1;
              const h = p.visitors ? Math.max(8, (p.visitors / max) * 100) : 3;
              return (
                <div key={p.d} className="flex flex-1 flex-col items-center">
                  <span className={`mb-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${today ? "bg-[#1D4ED8] text-white" : "text-[#1E3A8A]"}`}>{p.visitors}</span>
                  <div className="flex h-40 w-full items-end">
                    <div
                      className={`w-full rounded-t-2xl transition-all ${p.visitors ? (today ? "bg-gradient-to-t from-[#1E3A8A] to-[#3B82F6] shadow-lift" : "bg-gradient-to-t from-[#60A5FA] to-[#BFDBFE]") : "bg-slate-200"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className={`mt-2 text-[11px] font-bold ${today ? "text-[#1D4ED8]" : "text-ink/45"}`}>{today ? (km ? "ថ្ងៃនេះ" : "Today") : dayName(p.d)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </StaffShell>
  );
}
