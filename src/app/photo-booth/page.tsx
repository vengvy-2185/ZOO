import { Camera } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { PhotoBooth, type BoothSticker } from "@/components/visitor/PhotoBooth";
import { getBoothStickers } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

export default async function PhotoBoothPage() {
  const { locale, t } = getI18n();
  const animals: BoothSticker[] = (await getBoothStickers()).map((s) => ({ id: s.id, name: (locale === "km" && s.khmer_name) || s.name, image: s.image_url }));
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Camera} eyebrow={t.booth.eyebrow} title={t.booth.title} subtitle={t.booth.subtitle} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <PhotoBooth animals={animals} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
