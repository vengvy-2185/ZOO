import Link from "next/link";
import { Users, Sun, CalendarRange, CalendarDays, ShieldCheck, UserRoundPlus, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";

export const dynamic = "force-dynamic";

const TICKET_COLOR = "#65A30D";
const ppDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));

export default async function AdminVisitorsPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const km = locale === "km";
  const today = zooToday();
  const from30 = zooToday(-29);

  const [{ data: gate }, { data: checkins }, { data: bookedToday }] = await Promise.all([
    supabase.from("gate_entries").select("entry_date, category, count").gte("entry_date", from30),
    supabase
      .from("visitor_checkins")
      .select("checked_in_at, visitors_count, booking:booking_id(booking_items(quantity, ticket_type:ticket_type_id(name, khmer_name)))")
      .gte("checked_in_at", new Date(Date.now() - 31 * 86400000).toISOString()),
    supabase.from("bookings").select("booking_items(quantity)").eq("visit_date", today).neq("status", "cancelled"),
  ]);

  // Per-day totals: gate categories + scanned online tickets.
  type Day = Record<string, number>;
  const days = new Map<string, Day>();
  const day = (d: string) => days.get(d) ?? days.set(d, {}).get(d)!;
  for (const g of gate ?? []) {
    const d = day(g.entry_date);
    d[g.category] = (d[g.category] ?? 0) + g.count;
  }
  const ticketTypesToday = new Map<string, number>();
  for (const c of (checkins ?? []) as any[]) {
    const date = ppDate(c.checked_in_at);
    const d = day(date);
    d.tickets = (d.tickets ?? 0) + (c.visitors_count ?? 0);
    if (date === today) {
      for (const it of c.booking?.booking_items ?? []) {
        const label = (km && it.ticket_type?.khmer_name) || it.ticket_type?.name || "—";
        ticketTypesToday.set(label, (ticketTypesToday.get(label) ?? 0) + it.quantity);
      }
    }
  }
  const dayTotal = (d?: Day) => Object.values(d ?? {}).reduce((a, b) => a + b, 0);
  const sumRange = (n: number) => Array.from({ length: n }, (_, i) => dayTotal(days.get(zooToday(-i)))).reduce((a, b) => a + b, 0);

  const todayDay = days.get(today) ?? {};
  const todayTotal = dayTotal(todayDay);
  const booked = (bookedToday ?? []).reduce((s: number, b: any) => s + (b.booking_items ?? []).reduce((a: number, i: any) => a + i.quantity, 0), 0);

  const last14 = Array.from({ length: 14 }, (_, i) => zooToday(i - 13));
  const max14 = Math.max(1, ...last14.map((d) => dayTotal(days.get(d))));
  const series = [...GATE_CATEGORIES.map((c) => ({ key: c.key, color: c.color, label: km ? c.km : c.en, emoji: c.emoji })), { key: "tickets", color: TICKET_COLOR, label: km ? "សំបុត្រអនឡាញ" : "Online tickets", emoji: "🎟️" }];
  const v = t.admin.visitorsPage;
  const short = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", numberingSystem: "latn" }).format(new Date(d + "T12:00:00"));

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={Users}
        title={v.title}
        subtitle={km ? "ចំនួនភ្ញៀវចូលប្រចាំថ្ងៃ តាមប្រភេទ (រាប់នៅច្រកចូល + សំបុត្រអនឡាញដែលបានស្កេន)" : "Daily visitors by type — counted at the gate plus scanned online tickets."}
        actions={
          <Link href="/admin/gate" className="btn-primary">
            <UserRoundPlus size={16} /> {km ? "បើកកម្មវិធីរាប់ភ្ញៀវ" : "Open gate counter"}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [Sun, v.today, todayTotal, "#F59E0B"],
          [CalendarRange, v.week, sumRange(7), "#176B3A"],
          [CalendarDays, v.month, sumRange(30), "#7C3AED"],
        ].map(([Icon, label, value, color]: any) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-soft" style={{ backgroundColor: color }}>
              <Icon size={24} />
            </span>
            <div>
              <div className="text-xs font-semibold text-ink/50">{label}</div>
              <div className="font-display text-4xl font-extrabold text-forest">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today by type */}
      <section className="card mt-6 p-5 md:p-6">
        <h2 className="font-display text-lg font-bold text-forest">{km ? "ថ្ងៃនេះ តាមប្រភេទភ្ញៀវ" : "Today by visitor type"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {series.map((s) => {
            const n = todayDay[s.key] ?? 0;
            return (
              <div key={s.key} className="rounded-2xl p-4" style={{ background: `${s.color}14` }}>
                <div className="text-2xl">{s.emoji}</div>
                <div className="mt-1 text-xs font-bold text-ink/60">{s.label}</div>
                <div className="font-display text-3xl font-extrabold" style={{ color: s.color }}>
                  {n}
                </div>
                <div className="text-[11px] text-ink/45">{todayTotal ? Math.round((n / todayTotal) * 100) : 0}%</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/60">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 font-semibold">
            <Ticket size={13} className="text-primary" /> {km ? `កក់អនឡាញសម្រាប់ថ្ងៃនេះ៖ ${booked} នាក់` : `Booked online for today: ${booked}`}
          </span>
          {[...ticketTypesToday].map(([name, q]) => (
            <span key={name} className="rounded-full bg-light-green px-3 py-1.5 font-semibold text-primary">
              {name}: {q}
            </span>
          ))}
        </div>
      </section>

      {/* Last 14 days */}
      <section className="card mt-6 p-5 md:p-6">
        <h2 className="font-display text-lg font-bold text-forest">{km ? "១៤ ថ្ងៃចុងក្រោយ" : "Last 14 days"}</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-ink/60">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="flex h-56 min-w-[560px] items-end gap-2">
            {last14.map((d) => {
              const dd = days.get(d) ?? {};
              const tot = dayTotal(dd);
              return (
                <div key={d} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-bold text-forest opacity-70 group-hover:opacity-100">{tot || ""}</span>
                  <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg bg-black/[0.03]" style={{ height: `${(tot / max14) * 80}%`, minHeight: 4 }}>
                    {series.map((s) =>
                      dd[s.key] ? <div key={s.key} title={`${s.label}: ${dd[s.key]}`} style={{ height: `${(dd[s.key] / tot) * 100}%`, background: s.color }} /> : null
                    )}
                  </div>
                  <span className={`text-[10px] ${d === today ? "font-extrabold text-primary" : "text-ink/45"}`}>{short(d)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <p className="mt-6 flex items-start gap-3 rounded-3xl bg-cream p-4 text-sm text-ink/60 ring-1 ring-primary/10">
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-primary" /> {v.privacy}
      </p>
    </div>
  );
}
