import Link from "next/link";
import { TicketPercent, Plus, Pencil } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AdminPageHeader, AdminTable } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { cn } from "@/lib/utils/cn";
import { getScratchSettings, scratchStats } from "@/lib/server/scratch";
import { ScratchSettingsForm } from "@/components/admin/ScratchSettingsForm";

export const dynamic = "force-dynamic";

// Overview of every discount code with how often it has been used.
// (The admin layout has already checked the admin role.)
export default async function AdminDiscountsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const [{ data: codes }, { data: redemptions }, scratchSettings] = await Promise.all([
    db.from("discount_codes").select("*").order("created_at", { ascending: false }),
    db.from("discount_redemptions").select("code_id, amount_usd, booking:booking_id(status, created_at)"),
    getScratchSettings(),
  ]);
  const today = zooToday();
  const fresh = Date.now() - 30 * 60 * 1000;
  const used = new Map<string, { count: number; saved: number }>();
  for (const r of (redemptions ?? []) as any[]) {
    const b = r.booking;
    const counts = b?.status === "confirmed" || (b?.status === "pending" && new Date(b.created_at).getTime() > fresh);
    if (!counts) continue;
    const u = used.get(r.code_id) ?? { count: 0, saved: 0 };
    u.count += 1;
    u.saved += Number(r.amount_usd);
    used.set(r.code_id, u);
  }

  const list = (codes ?? []) as any[];
  const admin = list.filter((c) => c.source === "admin");
  const scratch = list.filter((c) => c.source === "scratch");
  const scratchUsed = scratch.filter((c) => used.get(c.id)?.count).length;

  const status = (c: any) => {
    const u = used.get(c.id)?.count ?? 0;
    if (!c.is_active) return { key: "off", en: "Switched off", km: "បានបិទ", cls: "bg-black/5 text-ink/50" };
    if (c.ends_on && today > c.ends_on) return { key: "expired", en: "Expired", km: "ផុតកំណត់", cls: "bg-black/5 text-ink/50" };
    if (c.max_uses && u >= c.max_uses) return { key: "used", en: "Used up", km: "ប្រើអស់", cls: "bg-amber-100 text-amber-700" };
    if (c.starts_on && today < c.starts_on) return { key: "soon", en: "Scheduled", km: "រង់ចាំចាប់ផ្តើម", cls: "bg-sky-100 text-sky-700" };
    return { key: "live", en: "Active", km: "កំពុងប្រើបាន", cls: "bg-light-green text-primary" };
  };
  const value = (c: any) => (c.kind === "percent" ? `${Number(c.value)}%` : `$${Number(c.value).toFixed(2)}`);
  const dates = (c: any) =>
    c.starts_on || c.ends_on ? `${c.starts_on ?? (km ? "ឥឡូវ" : "now")} ${km ? "ដល់" : "to"} ${c.ends_on ?? (km ? "គ្មានកំណត់" : "no end")}` : km ? "គ្មានកំណត់ថ្ងៃ" : "No date limit";

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={TicketPercent}
        title={km ? "កូដបញ្ចុះតម្លៃ" : "Discount codes"}
        subtitle={km ? "បង្កើតកូដ កំណត់ថ្ងៃ និងចំនួនមនុស្សប្រើ។ ភ្ញៀវវាយកូដនៅទំព័របង់ប្រាក់។" : "Create codes, set dates and how many people can use them. Visitors type the code at checkout."}
        actions={
          <Link href="/admin/manage/discounts/new" className="btn-primary">
            <Plus size={16} /> {km ? "បង្កើតកូដថ្មី" : "New code"}
          </Link>
        }
      />
      <AdminTable
        head={[km ? "ឈ្មោះ" : "Name", km ? "កូដ" : "Code", km ? "បញ្ចុះ" : "Off", km ? "រយៈពេល" : "Dates", km ? "បានប្រើ" : "Used", km ? "ស្ថានភាព" : "Status", ""]}
        empty={admin.length === 0 && (km ? "មិនទាន់មានកូដនៅឡើយ" : "No codes yet")}
      >
        {admin.map((c) => {
          const u = used.get(c.id) ?? { count: 0, saved: 0 };
          const st = status(c);
          const pct = c.max_uses ? Math.min(100, (u.count / c.max_uses) * 100) : 0;
          return (
            <tr key={c.id} className="transition hover:bg-light-green/40">
              <td className="px-4 py-3 font-bold text-forest">{(km && c.name_km) || c.name}</td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-cream px-2 py-1 font-mono text-sm font-bold tracking-wider text-forest">{c.code}</span>
              </td>
              <td className="px-4 py-3 font-bold text-primary">{value(c)}</td>
              <td className="px-4 py-3 text-xs text-ink/60">{dates(c)}</td>
              <td className="px-4 py-3">
                <div className="text-sm font-semibold text-forest">
                  {u.count}
                  {c.max_uses ? ` / ${c.max_uses}` : ""}
                </div>
                {c.max_uses && (
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-cream">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {u.saved > 0 && <div className="text-[11px] text-ink/45">{km ? `បញ្ចុះសរុប $${u.saved.toFixed(2)}` : `$${u.saved.toFixed(2)} saved`}</div>}
              </td>
              <td className="px-4 py-3">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.cls)}>{km ? st.km : st.en}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/manage/discounts/${c.id}`} className="inline-flex items-center gap-1 rounded-xl bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                  <Pencil size={13} /> {km ? "កែប្រែ" : "Edit"}
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <ScratchSettingsForm s={scratchSettings} st={await scratchStats(scratchSettings)} km={km} used={scratchUsed} />
    </div>
  );
}
