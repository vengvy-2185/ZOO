import { createClient } from "@/lib/supabase/server";
import { VisitorsTrendChart, TicketSalesChart, RevenueChart } from "@/components/admin/DashboardCharts";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { num, formatFullDate } from "@/lib/utils/age";
import { PawPrint, Dna, Users, Ticket, Wallet, Map as MapIcon, Plus, TrendingUp, PieChart, Cake, CheckCircle2 } from "lucide-react";

async function getStats() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [
    { count: totalAnimals },
    { count: totalSpecies },
    { count: activeZones },
    { data: todaysBookings },
    { data: weekBookings },
    { data: birthdays },
    { data: recentCheckins },
    { data: ticketTypeSales },
  ] = await Promise.all([
    supabase.from("animals").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("species").select("*", { count: "exact", head: true }),
    supabase.from("zoo_zones").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("bookings").select("*, booking_items(quantity, line_total_usd)").eq("visit_date", today),
    supabase
      .from("bookings")
      .select("visit_date, total_usd, booking_items(quantity)")
      .gte("visit_date", sevenDaysAgo)
      .order("visit_date"),
    supabase.rpc("get_upcoming_birthdays", { p_days: 0 }),
    supabase
      .from("visitor_checkins")
      .select("*, bookings(booking_code, visit_date)")
      .order("checked_in_at", { ascending: false })
      .limit(5),
    supabase.from("booking_items").select("quantity, ticket_types(name)"),
  ]);

  const todaysVisitors = (todaysBookings ?? []).reduce(
    (sum: number, b: any) => sum + (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    0
  );
  const todaysTickets = (todaysBookings ?? []).length;
  const todaysRevenue = (todaysBookings ?? []).reduce((sum: number, b: any) => sum + Number(b.total_usd ?? 0), 0);

  const trendByDate = new Map<string, { visitors: number; revenue: number }>();
  (weekBookings ?? []).forEach((b: any) => {
    const cur = trendByDate.get(b.visit_date) ?? { visitors: 0, revenue: 0 };
    cur.visitors += (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0);
    cur.revenue += Number(b.total_usd ?? 0);
    trendByDate.set(b.visit_date, cur);
  });
  const visitorsTrend = [...trendByDate.entries()].map(([date, v]) => ({
    date: date.slice(5),
    visitors: v.visitors,
  }));
  const revenueTrend = [...trendByDate.entries()].map(([date, v]) => ({
    date: date.slice(5),
    revenue: Math.round(v.revenue),
  }));

  const salesByType = new Map<string, number>();
  (ticketTypeSales ?? []).forEach((i: any) => {
    const name = i.ticket_types?.name ?? "Other";
    salesByType.set(name, (salesByType.get(name) ?? 0) + i.quantity);
  });
  const ticketSales = [...salesByType.entries()].map(([name, value]) => ({ name, value }));

  return {
    totalAnimals: totalAnimals ?? 0,
    totalSpecies: totalSpecies ?? 0,
    activeZones: activeZones ?? 0,
    todaysVisitors,
    todaysTickets,
    todaysRevenue,
    birthdays: birthdays ?? [],
    recentCheckins: recentCheckins ?? [],
    visitorsTrend,
    revenueTrend,
    ticketSales,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const { locale, t } = getI18n();
  const d = t.admin.dashboard;
  const n = (v: number | string) => num(v, locale);

  const cards = [
    [d.totalAnimals, n(stats.totalAnimals), PawPrint, "#176B3A", "/admin/animals"],
    [d.totalSpecies, n(stats.totalSpecies), Dna, "#0E7C9C", "/admin/species"],
    [d.todaysVisitors, n(stats.todaysVisitors), Users, "#7C3AED", "/admin/visitors"],
    [d.todaysTickets, n(stats.todaysTickets), Ticket, "#EA580C", "/admin/bookings"],
    [d.todaysRevenue, `$${n(stats.todaysRevenue.toFixed(2))}`, Wallet, "#B8791A", "/admin/reports"],
    [d.activeZones, n(stats.activeZones), MapIcon, "#DB2777", "/admin/zones"],
  ] as const;

  const today = locale === "km" ? formatFullDate(new Date().toISOString(), "km") : new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink/50">{today}</p>
          <h1 className="font-display text-3xl font-extrabold text-forest">{t.admin.items.dashboard}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/animals/new" className="btn-primary px-4 py-2">
            <Plus size={16} /> {t.admin.addAnimal}
          </Link>
          <Link href="/admin/map" className="btn-outline px-4 py-2">
            <MapIcon size={16} /> {t.admin.mapEditor}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {cards.map(([label, value, Icon, color, href]) => (
          <Link key={label} href={href} className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft transition group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
            >
              <Icon size={21} />
            </span>
            <div className="mt-3 text-xs font-semibold text-ink/50">{label}</div>
            <div className="font-display text-2xl font-extrabold text-forest">{value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-forest">
            <TrendingUp size={18} className="text-primary" /> {d.visitors7}
          </h3>
          <VisitorsTrendChart data={stats.visitorsTrend} />
        </div>
        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-forest">
            <PieChart size={18} className="text-primary" /> {d.ticketSales}
          </h3>
          <TicketSalesChart data={stats.ticketSales} />
        </div>
        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-forest">
            <Wallet size={18} className="text-primary" /> {d.revenue7}
          </h3>
          <RevenueChart data={stats.revenueTrend} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest">
              <Cake size={18} className="text-primary" /> {d.birthdays}
            </h2>
            <Link href="/admin/birthdays" className="text-xs font-bold text-primary">
              {t.common.viewAll}
            </Link>
          </div>
          {stats.birthdays.length === 0 ? (
            <p className="rounded-2xl bg-cream p-4 text-sm text-ink/50">{d.noBirthdays}</p>
          ) : (
            <ul className="divide-y divide-black/5 text-sm">
              {stats.birthdays.map((b: any) => (
                <li key={b.animal_id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/30 text-forest">
                    <Cake size={16} />
                  </span>
                  <span className="flex-1 font-semibold text-forest">{b.name}</span>
                  <span className="text-xs text-ink/50">{b.animal_code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest">
              <CheckCircle2 size={18} className="text-primary" /> {d.checkins}
            </h2>
            <Link href="/admin/bookings" className="text-xs font-bold text-primary">
              {t.common.viewAll}
            </Link>
          </div>
          {stats.recentCheckins.length === 0 ? (
            <p className="rounded-2xl bg-cream p-4 text-sm text-ink/50">{d.noCheckins}</p>
          ) : (
            <ul className="divide-y divide-black/5 text-sm">
              {stats.recentCheckins.map((c: any) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-light-green text-primary">
                    <CheckCircle2 size={16} />
                  </span>
                  <span className="flex-1 font-semibold text-forest">{c.bookings?.booking_code}</span>
                  <span className="rounded-full bg-light-green px-2.5 py-0.5 text-xs font-bold text-primary">
                    {d.visitorsCount(n(c.visitors_count))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
