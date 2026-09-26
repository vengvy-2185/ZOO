import { Cake } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { OlderGame, type OlderAnimal } from "@/components/visitor/OlderGame";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 600;

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "អ្នកណាចាស់ជាង?" : "Who Is Older?" };
}

export default async function OlderPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const animals: OlderAnimal[] = ((await getActiveAnimals()) as any[])
    .filter((a) => a.main_image_url && a.date_of_birth && a.show_birthday_publicly !== false)
    .map((a) => ({
      code: a.animal_code,
      name: (km && a.khmer_name) || a.name,
      species: (km && a.species?.khmer_name) || a.species?.common_name || "",
      image: a.main_image_url,
      dob: String(a.date_of_birth).slice(0, 10),
    }));

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Cake}
        eyebrow={km ? "ល្បែងថ្មី" : "New game"}
        title={km ? "អ្នកណាចាស់ជាង?" : "Who Is Older?"}
        subtitle={km ? "សត្វពីរក្បាល ជ្រើសរើសមួយដែលកើតមុន។ ត្រូវជាប់ៗគ្នាបានប៉ុន្មានដង?" : "Two animals: tap the one born first. How many can you get right in a row?"}
      />
      <main className="mx-auto max-w-4xl px-4 pb-12 md:px-6">
        <OlderGame animals={animals} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
