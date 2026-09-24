import { Palette } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ColoringBook } from "@/components/visitor/ColoringBook";
import { getI18n } from "@/lib/i18n/server";

export default function ColoringPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Palette}
        eyebrow={km ? "សម្រាប់កុមារ" : "For kids"}
        title={km ? "សៀវភៅគូររូបសត្វ" : "Animal Coloring Book"}
        subtitle={km ? "ជ្រើសសត្វ ជ្រើសពណ៌ ហើយចុចលើរូបដើម្បីលាបពណ៌។ រួចរក្សាទុករូបដ៏ស្អាតរបស់អ្នក!" : "Pick an animal and a colour, then tap the picture to fill it in. Save your masterpiece when you're done!"}
      />
      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <ColoringBook />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
