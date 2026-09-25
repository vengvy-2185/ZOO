import { createClient } from "@/lib/supabase/server";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";
import { GateCounter } from "./GateCounter";
import { StaffShell } from "@/components/staff/StaffShell";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

export const generateMetadata = () => staffTitle("Gate counter", "រាប់ភ្ញៀវ");

export default async function GatePage() {
  const { locale } = getI18n();
  const { data } = await createClient().from("gate_entries").select("category, count").eq("entry_date", zooToday());
  const totals = Object.fromEntries(GATE_CATEGORIES.map((c) => [c.key, 0])) as Record<string, number>;
  for (const r of data ?? []) totals[r.category] = (totals[r.category] ?? 0) + r.count;
  const km = locale === "km";
  return (
    <StaffShell active="gate" title={km ? "បញ្ជររាប់ភ្ញៀវ" : "Gate counter"} subtitle={km ? "រាប់ភ្ញៀវដែលទិញសំបុត្រនៅច្រកចូល។" : "Count visitors who buy at the gate."}>
      <GateCounter initial={totals} locale={locale} embedded tone="blue" />
    </StaffShell>
  );
}
