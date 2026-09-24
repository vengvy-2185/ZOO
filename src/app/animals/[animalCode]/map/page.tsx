import { notFound } from "next/navigation";
import { Navigation, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ZooMap, type AnimalMarker } from "@/components/visitor/ZooMap";
import { getI18n } from "@/lib/i18n/server";
import type { ZooZone, Facility } from "@/types/domain";

async function getData(animalCode: string) {
  const supabase = createClient();
  const { data: animal } = await supabase
    .from("animals")
    .select("id, animal_code, name, khmer_name, main_image_url, category:category_id(slug)")
    .eq("animal_code", animalCode)
    .single();
  if (!animal) return null;

  const [{ data: zones }, { data: facilities }, { data: location }, { data: current }] = await Promise.all([
    supabase.from("zoo_zones").select("*").eq("is_active", true),
    supabase.from("facilities").select("*").eq("is_active", true),
    supabase.rpc("get_current_animal_location", { p_animal_id: animal.id }),
    supabase
      .from("animal_locations")
      .select("habitat:habitat_id(name, khmer_name)")
      .eq("animal_id", animal.id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const loc = location?.[0];
  const marker: AnimalMarker | null = loc
    ? {
        id: animal.id,
        animal_code: animal.animal_code,
        name: animal.name,
        name_km: animal.khmer_name,
        image: animal.main_image_url,
        categorySlug: (animal as any).category?.slug ?? null,
        map_x: loc.map_x,
        map_y: loc.map_y,
      }
    : null;

  return {
    animal,
    zones: (zones ?? []) as ZooZone[],
    facilities: (facilities ?? []) as Facility[],
    marker,
    loc,
    habitat: (current as any)?.habitat as { name: string; khmer_name: string | null } | null,
  };
}

export default async function FindAnimalPage({ params }: { params: { animalCode: string } }) {
  const [data, { mapImageUrl }] = await Promise.all([getData(params.animalCode), getBranding()]);
  if (!data) notFound();
  const { locale, t } = getI18n();
  const name = (locale === "km" && data.animal.khmer_name) || data.animal.name;
  const habitatName = (locale === "km" && data.habitat?.khmer_name) || data.habitat?.name || data.loc?.habitat_name || "";

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Navigation}
        eyebrow={t.findPage.eyebrow}
        title={t.findPage.title(name)}
        subtitle={data.loc ? t.findPage.route(name, data.loc.zone_code, habitatName) : t.findPage.unavailable}
      />
      <main className="mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <ZooMap
          zones={data.zones}
          facilities={data.facilities}
          animals={data.marker ? [data.marker] : []}
          highlightAnimalCode={data.animal.animal_code}
          backgroundImageUrl={mapImageUrl}
        />
        <div className="mt-5 flex items-start gap-3 rounded-3xl bg-cream p-4 text-sm text-ink/70 ring-1 ring-primary/10">
          <Info size={18} className="mt-0.5 flex-shrink-0 text-primary" />
          {t.findPage.tip}
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
