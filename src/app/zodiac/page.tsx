import { Moon } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ZodiacAnimal } from "@/components/visitor/ZodiacAnimal";
import { getGameAnimals } from "@/lib/data/game-animals";
import { getI18n } from "@/lib/i18n/server";

export default async function ZodiacPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Moon}
        eyebrow={km ? "ឆ្នាំខ្មែរ 12 សត្វ" : "The 12 Khmer zodiac animals"}
        title={km ? "សត្វឆ្នាំកំណើតរបស់អ្នក" : "Your Zodiac Animal"}
        subtitle={km ? "បញ្ចូលថ្ងៃកំណើត ដើម្បីដឹងថាអ្នកកើតឆ្នាំសត្វអ្វី និងមិត្តសត្វរបស់អ្នកនៅសួនសត្វ។" : "Enter your birthday to find your Khmer zodiac animal, and your animal friend at the zoo."}
      />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <ZodiacAnimal animals={await getGameAnimals()} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
