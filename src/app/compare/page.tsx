import { Ruler } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { MeVsAnimals } from "@/components/visitor/MeVsAnimals";
import { getI18n } from "@/lib/i18n/server";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getSessionUser } from "@/lib/auth/session";
import { SPECIES_STATS, type CompareAnimal } from "@/lib/data/compare";

export default async function ComparePage() {
  const { locale, t } = getI18n();
  const [active, me] = await Promise.all([getActiveAnimals(), getSessionUser()]);
  // The zoo's own residents, with their real photos and their species' typical size.
  const animals: CompareAnimal[] = (active as any[]).flatMap((a) => {
    const stats = SPECIES_STATS[String(a.species?.common_name ?? "").toLowerCase()];
    if (!stats) return [];
    return [{ code: a.animal_code, name: (locale === "km" && a.khmer_name) || a.name, image: a.main_image_url, ...stats }];
  });
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Ruler} eyebrow={t.compare.eyebrow} title={t.compare.title} subtitle={t.compare.subtitle} />
      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <MeVsAnimals animals={animals} me={{ name: me?.fullName ?? null, avatar: me?.avatarUrl ?? null }} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
