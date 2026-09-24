import Link from "next/link";
import { UserRoundPlus, BarChart3, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";
import { GateCounter } from "@/app/staff/(protected)/gate/GateCounter";

export const dynamic = "force-dynamic";

// Same counter as /staff/gate, inside the admin shell so the menu stays visible.
export default async function AdminGatePage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const { data } = await createClient().from("gate_entries").select("category, count").eq("entry_date", zooToday());
  const totals = Object.fromEntries(GATE_CATEGORIES.map((c) => [c.key, 0])) as Record<string, number>;
  for (const r of data ?? []) totals[r.category] = (totals[r.category] ?? 0) + r.count;

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={UserRoundPlus}
        title={t.admin.items.gate}
        subtitle={km ? "ចុច + ពេលភ្ញៀវទិញសំបុត្រនៅច្រកចូល។ សំបុត្រអនឡាញត្រូវស្កេនជំនួសវិញ។" : "Tap + for every walk-in visitor who pays at the gate. Online tickets are scanned instead."}
        actions={
          <>
            <Link href="/staff/scanner" className="btn-outline bg-white">
              <ScanLine size={16} /> {t.admin.ticketScanner}
            </Link>
            <Link href="/admin/visitors" className="btn-primary">
              <BarChart3 size={16} /> {t.admin.items.visitors}
            </Link>
          </>
        }
      />
      <div className="mx-auto max-w-2xl">
        <GateCounter initial={totals} locale={locale} embedded />
      </div>
    </div>
  );
}
