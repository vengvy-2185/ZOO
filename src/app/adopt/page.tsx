import { HeartHandshake } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { AdoptForm, type AdoptAnimal } from "@/components/visitor/AdoptForm";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdoptPage({ searchParams }: { searchParams: { animal?: string } }) {
  const { t, locale } = getI18n();
  const me = await getSessionUser();
  const animals: AdoptAnimal[] = ((await getActiveAnimals()) as any[]).map((a) => ({
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
      <PageHeader icon={HeartHandshake} eyebrow={t.adopt.eyebrow} title={t.adopt.title} subtitle={t.adopt.subtitle} />
      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <AdoptForm animals={animals} initialCode={searchParams.animal} me={me ? { name: me.fullName ?? "", email: me.email ?? "" } : null} km={locale === "km"} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
