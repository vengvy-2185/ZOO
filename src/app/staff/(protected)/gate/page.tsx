import { createClient } from "@/lib/supabase/server";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";
import { GateCounter } from "./GateCounter";

export const dynamic = "force-dynamic";

export default async function GatePage() {
  const { locale } = getI18n();
  const { data } = await createClient().from("gate_entries").select("category, count").eq("entry_date", zooToday());
  const totals = Object.fromEntries(GATE_CATEGORIES.map((c) => [c.key, 0])) as Record<string, number>;
  for (const r of data ?? []) totals[r.category] = (totals[r.category] ?? 0) + r.count;
  return <GateCounter initial={totals} locale={locale} />;
}
