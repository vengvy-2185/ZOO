import { Route } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { DayPlanner, type PlannerAnimal, type PlannerEvent } from "@/components/visitor/DayPlanner";
import { getActiveAnimals, getZonesAndFacilities } from "@/lib/data/zoo";
import { ZOO_EVENTS } from "@/lib/data/events";
import { getI18n } from "@/lib/i18n/server";

export default async function PlannerPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const [active, { zones }] = await Promise.all([getActiveAnimals(), getZonesAndFacilities()]);
  const zoneBy = new Map((zones as any[]).map((z) => [String(z.code), z]));

  // The zone letter is part of every animal code (e.g. ELEP-A-003 lives in zone A).
  const animals: PlannerAnimal[] = (active as any[]).map((a) => {
    const letter = String(a.animal_code).match(/-([A-Z])-/)?.[1] ?? "A";
    const z = zoneBy.get(letter);
    return {
      code: a.animal_code,
      name: (km && a.khmer_name) || a.name,
      image: a.main_image_url,
      zone: letter,
      zoneName: (km && z?.khmer_name) || z?.name || letter,
      zoneColor: z?.color || "#176B3A",
    };
  });
  const events: PlannerEvent[] = ZOO_EVENTS.filter((e) => e.days === "daily").map((e) => ({
    animalCode: e.animalCode,
    start: e.start,
    title: km ? e.title_km : e.title,
  }));

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Route} eyebrow={t.planner.eyebrow} title={t.planner.title} subtitle={t.planner.subtitle} />
      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <DayPlanner animals={animals} events={events} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
