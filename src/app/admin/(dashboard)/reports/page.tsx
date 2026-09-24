import { BarChart3, CalendarDays, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate, num } from "@/lib/utils/age";

export default async function AdminReportsPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [{ data: bookings }, { data: qrs }] = await Promise.all([
    supabase.from("bookings").select("visit_date, total_usd, booking_items(quantity)").gte("visit_date", since).order("visit_date"),
    supabase.from("animal_qr_codes").select("scan_count, animals(name, khmer_name, main_image_url)").order("scan_count", { ascending: false }).limit(5),
  ]);

  const byDate = new Map<string, { visitors: number; revenue: number }>();
  (bookings ?? []).forEach((b: any) => {
    const cur = byDate.get(b.visit_date) ?? { visitors: 0, revenue: 0 };
    cur.visitors += (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0);
    cur.revenue += Number(b.total_usd);
    byDate.set(b.visit_date, cur);
  });
  const maxScans = Math.max(1, ...(qrs ?? []).map((q: any) => q.scan_count ?? 0));
  const r = t.admin.reports;

  return (
    <div className="p-8">
      <AdminPageHeader icon={BarChart3} title={r.title} subtitle={r.subtitle} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-forest">
            <CalendarDays size={18} className="text-primary" /> {r.byDay}
          </h2>
          <div className="max-h-96 divide-y divide-black/5 overflow-y-auto text-sm">
            {[...byDate.entries()].map(([date, v]) => (
              <div key={date} className="grid grid-cols-3 gap-2 py-2.5">
                <span className="font-semibold text-forest">{formatFullDate(date, locale)}</span>
                <span className="text-ink/60">{r.visitors(num(v.visitors, locale))}</span>
                <span className="text-right font-bold text-primary">${v.revenue.toFixed(2)}</span>
              </div>
            ))}
            {byDate.size === 0 && <p className="rounded-2xl bg-cream p-4 text-ink/50">{r.none}</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-forest">
            <QrCode size={18} className="text-primary" /> {r.mostScanned}
          </h2>
          <div className="space-y-3 text-sm">
            {(qrs ?? []).map((q: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.animals?.main_image_url ?? ""} alt="" className="h-10 w-10 rounded-xl bg-light-green object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-forest">{(locale === "km" && q.animals?.khmer_name) || q.animals?.name}</span>
                    <span className="text-xs font-bold text-primary">{r.scans(num(q.scan_count, locale))}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-light-green">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf" style={{ width: `${((q.scan_count ?? 0) / maxScans) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {(qrs ?? []).length === 0 && <p className="rounded-2xl bg-cream p-4 text-ink/50">{r.noScans}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
