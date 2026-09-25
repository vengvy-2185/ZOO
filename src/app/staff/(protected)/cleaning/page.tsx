import { CheckCircle2, Circle, MapPinned, Store } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";
import { toggleTask } from "../actions";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

const TYPE: Record<string, { en: string; km: string }> = {
  entrance: { en: "Entrance", km: "ច្រកចូល" },
  restaurant: { en: "Restaurant", km: "ភោជនីយដ្ឋាន" },
  cafe: { en: "Café", km: "កាហ្វេ" },
  restroom: { en: "Restroom", km: "បង្គន់" },
  toilet: { en: "Restroom", km: "បង្គន់" },
  parking: { en: "Parking", km: "ចំណតរថយន្ត" },
  first_aid: { en: "First aid", km: "សង្គ្រោះបឋម" },
  gift_shop: { en: "Gift shop", km: "ហាងអនុស្សាវរីយ៍" },
  shop: { en: "Shop", km: "ហាង" },
  info: { en: "Information", km: "ព័ត៌មាន" },
  playground: { en: "Playground", km: "សួនកុមារ" },
  photo_spot: { en: "Photo spot", km: "កន្លែងថតរូប" },
  rest_area: { en: "Rest area", km: "កន្លែងសម្រាក" },
};

/** Cleaners: every zone and facility, ticked off as it's cleaned today (by anyone on the team). */
export const generateMetadata = () => staffTitle("Cleaning", "សម្អាត");

export default async function CleaningPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const [{ data: zones }, { data: facilities }, { data: ticks }] = await Promise.all([
    db.from("zoo_zones").select("id, code, name, khmer_name").eq("is_active", true).order("code"),
    db.from("facilities").select("id, type, name, khmer_name").eq("is_active", true).order("type"),
    db.from("staff_task_checks").select("ref, user_id, created_at").eq("kind", "cleaning").eq("check_date", zooToday()),
  ]);
  const ids = [...new Set((ticks ?? []).map((t: any) => t.user_id).filter(Boolean))];
  const { data: who } = ids.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
  const name = new Map((who ?? []).map((w: any) => [w.user_id, w.full_name]));
  const tick = new Map((ticks ?? []).map((t: any) => [t.ref, t]));
  const spots = [
    ...(zones ?? []).map((z: any) => ({ id: z.id, name: (km && z.khmer_name) || z.name, sub: `${km ? "តំបន់" : "Zone"} ${z.code ?? ""}`.trim(), icon: MapPinned })),
    ...(facilities ?? []).map((f: any) => ({ id: f.id, name: (km && f.khmer_name) || f.name, sub: (km ? TYPE[f.type]?.km : TYPE[f.type]?.en) ?? f.type.replace(/_/g, " "), icon: Store })),
  ];
  const doneCount = spots.filter((s) => tick.has(s.id)).length;
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "បញ្ជីសម្អាត", sub: "តំបន់ និងសេវាកម្មទាំងអស់។ ចុចធីកពេលសម្អាតរួច ក្រុមការងារឃើញភ្លាមៗ។", progress: "សម្អាតរួចថ្ងៃនេះ", by: "ដោយ", none: "មិនទាន់មានតំបន់ ឬសេវាកម្មទេ។" }
    : { title: "Cleaning checklist", sub: "Every zone and facility. Tick it when it's clean; the team sees it straight away.", progress: "Cleaned today", by: "by", none: "No zones or facilities yet." };

  return (
    <StaffShell
      title={L.title}
      subtitle={L.sub}
      hero={
        <div className="mt-4 max-w-sm">
          <p className="text-sm font-bold text-white/85">{L.progress}: {doneCount} / {spots.length}</p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${spots.length ? (doneCount / spots.length) * 100 : 0}%` }} /></div>
        </div>
      }
    >
      {spots.length === 0 && <p className="card p-8 text-center text-sm text-ink/55">{L.none}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {spots.map((s) => {
          const t: any = tick.get(s.id);
          return (
            <form key={s.id} action={toggleTask.bind(null, "cleaning", s.id)}>
              <button className={cn("card flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5", t && "bg-[#EEF2FF] ring-2 ring-[#2563EB]/40")}>
                <span className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", t ? "bg-[#1D4ED8] text-white" : "bg-[#EEF2FF] text-[#1D4ED8]")}><s.icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-forest">{s.name}</span>
                  <span className="block truncate text-xs text-ink/50">{t ? `${time(t.created_at)} ${L.by} ${name.get(t.user_id) ?? "Admin"}` : s.sub}</span>
                </span>
                {t ? <CheckCircle2 size={26} className="flex-shrink-0 text-[#1D4ED8]" /> : <Circle size={26} className="flex-shrink-0 text-ink/20" />}
              </button>
            </form>
          );
        })}
      </div>
    </StaffShell>
  );
}
