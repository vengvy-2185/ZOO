import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { AnimalMatch, type MatchResident } from "@/components/visitor/AnimalMatch";
import { getActiveAnimals } from "@/lib/data/zoo";
import { SPECIES_MATCH, type PersonalityKey } from "@/lib/data/personality";
import { getI18n } from "@/lib/i18n/server";

export default async function MatchPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const active = (await getActiveAnimals()) as any[];
  // One real resident per personality (matched by species name).
  const residents: MatchResident[] = (Object.keys(SPECIES_MATCH) as PersonalityKey[]).flatMap((key) => {
    const a = active.find((x) => String(x.species?.common_name ?? "").toLowerCase().includes(SPECIES_MATCH[key]));
    return a ? [{ key, code: a.animal_code, name: (km && a.khmer_name) || a.name, species: (km && a.species?.khmer_name) || a.species?.common_name || "", image: a.main_image_url }] : [];
  });

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Sparkles} eyebrow={t.match.eyebrow} title={t.match.title} subtitle={t.match.subtitle} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <AnimalMatch residents={residents} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
