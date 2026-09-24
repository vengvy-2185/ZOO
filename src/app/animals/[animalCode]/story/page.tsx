import { notFound } from "next/navigation";
import { getStory as getCachedStory } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { StorybookReader } from "@/components/visitor/StorybookReader";
import { getI18n } from "@/lib/i18n/server";
import type { StoryPage } from "@/types/domain";

const getStory = getCachedStory;

export default async function StoryPageRoute({ params }: { params: { animalCode: string } }) {
  const data = await getStory(params.animalCode);
  if (!data) notFound();
  const { locale, t } = getI18n();
  const name = (locale === "km" && data.animal.khmer_name) || data.animal.name;
  const title = (locale === "km" && (data.story as any)?.title_km) || t.story.title(name);

  // Pick each page's Khmer text when available, falling back to English.
  const pages = data.pages.map((p: any) => ({
    ...p,
    title: (locale === "km" && p.title_km) || p.title,
    content: (locale === "km" && p.content_km) || p.content,
    image_url: p.image_url ?? data.animal.main_image_url,
  })) as StoryPage[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-background pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <StorybookReader title={title} pages={pages} />
      </main>
      <BottomNav />
    </div>
  );
}
