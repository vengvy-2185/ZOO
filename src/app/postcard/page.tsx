import { Mail } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import type { QuizAnimal } from "@/components/visitor/AnimalQuiz";
import { PostcardMaker } from "@/components/visitor/PostcardMaker";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

export default async function PostcardPage() {
  const { t } = getI18n();
  const animals = (await getActiveAnimals()) as any[];
  const quizAnimals: QuizAnimal[] = animals
    .filter((a) => a.main_image_url)
    .map((a) => ({
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
      <PageHeader icon={Mail} eyebrow={t.postcard.eyebrow} title={t.postcard.title} subtitle={t.postcard.subtitle} />
      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <PostcardMaker animals={quizAnimals} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
