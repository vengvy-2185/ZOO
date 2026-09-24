import { HeartHandshake, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, AdminTable, Thumb } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate } from "@/lib/utils/age";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  paid: "bg-light-green text-primary",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-black/5 text-ink/50",
};

export default async function AdminAdoptionsPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const { data: rows } = await createClient()
    .from("adoptions")
    .select("code, access_key, adopter_name, adopter_email, tier, amount_usd, status, created_at, paid_at, animal:animal_id(name, khmer_name, main_image_url)")
    .order("created_at", { ascending: false })
    .limit(200);
  const list = (rows ?? []) as any[];
  const raised = list.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount_usd), 0);

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={HeartHandshake}
        title={t.admin.items.adoptions}
        subtitle={km ? `ទទួលបានសរុប $${raised.toFixed(2)} ពីការឧបត្ថម្ភសត្វ` : `$${raised.toFixed(2)} raised from animal adoptions`}
      />
      <AdminTable
        head={["", km ? "សត្វ" : "Animal", km ? "អ្នកឧបត្ថម្ភ" : "Adopter", km ? "កម្រិត" : "Tier", km ? "ចំនួន" : "Amount", t.admin.status, km ? "កាលបរិច្ឆេទ" : "Date", ""]}
        empty={list.length === 0 && (km ? "មិនទាន់មានការឧបត្ថម្ភនៅឡើយ" : "No adoptions yet")}
      >
        {list.map((r) => (
          <tr key={r.code} className="transition hover:bg-light-green/40">
            <td className="px-4 py-2.5">
              <Thumb src={r.animal?.main_image_url} className="h-11 w-11 rounded-full" />
            </td>
            <td className="px-4 py-2.5 font-bold text-forest">{(km && r.animal?.khmer_name) || r.animal?.name}</td>
            <td className="px-4 py-2.5">
              <div className="font-semibold text-ink">{r.adopter_name}</div>
              <div className="text-[11px] text-ink/45">{r.adopter_email}</div>
            </td>
            <td className="px-4 py-2.5 text-ink/70">{t.adopt.tiers[r.tier as keyof typeof t.adopt.tiers]?.name ?? r.tier}</td>
            <td className="px-4 py-2.5 font-bold text-forest">${Number(r.amount_usd).toFixed(2)}</td>
            <td className="px-4 py-2.5">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[r.status] ?? ""}`}>{r.status}</span>
            </td>
            <td className="px-4 py-2.5 text-xs text-ink/60">{formatFullDate(r.paid_at ?? r.created_at, locale)}</td>
            <td className="px-4 py-2.5 text-right">
              <a href={`/adopt/${r.code}?k=${r.access_key}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                {km ? "វិញ្ញាបនបត្រ" : "Certificate"} <ExternalLink size={12} />
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
