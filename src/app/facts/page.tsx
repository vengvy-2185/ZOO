import { Lightbulb } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { FactCards, type Fact } from "@/components/visitor/FactCards";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

/** Splits a fact sheet into single sentences (English "." or Khmer "។"). */
function sentences(text: string | null | undefined) {
  return (text ?? "")
    .split(/(?<=[.!?។])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

export default async function FactsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const animals = (await getActiveAnimals()) as any[];
  const facts: Fact[] = animals
    .filter((a) => a.main_image_url)
    .flatMap((a) => {
      const name = (km && a.khmer_name) || a.name;
      const sheet = [(km && a.interesting_facts_km) || a.interesting_facts, (km && a.species?.description_km) || a.species?.description].join("\n");
      return sentences(sheet)
        .slice(0, 3)
        .map((text) => ({ code: a.animal_code, name, image: a.main_image_url, text }));
    });

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Lightbulb}
        eyebrow={km ? "រៀនពីសត្វរបស់យើង" : "Learn from our animals"}
        title={km ? "ចំណេះដឹងពីសត្វ" : "Animal Facts"}
        subtitle={km ? "ចំណេះដឹងគួរឱ្យភ្ញាក់ផ្អើលអំពីសត្វដែលរស់នៅសួនសត្វរបស់យើង។ តើអ្នករៀនបានប៉ុន្មានថ្ងៃនេះ?" : "Surprising facts about the animals who live at our zoo. How many new things will you learn today?"}
      />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <FactCards facts={facts} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
