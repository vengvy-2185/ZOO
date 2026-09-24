import { Heart } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { FavoritesGrid, type FavCardAnimal } from "@/components/visitor/FavoritesGrid";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

export default async function FavoritesPage() {
  const { t } = getI18n();
  const animals: FavCardAnimal[] = ((await getActiveAnimals()) as any[]).map((a) => ({
    code: a.animal_code,
    name: a.name,
    name_km: a.khmer_name,
    species: a.species?.common_name ?? null,
    species_km: a.species?.khmer_name ?? null,
    image: a.main_image_url,
  }));

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Heart} eyebrow="♥" title={t.extra.favTitle} subtitle={t.extra.favSubtitle} />
      <main className="mx-auto max-w-7xl px-4 md:px-6">
        <FavoritesGrid animals={animals} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
