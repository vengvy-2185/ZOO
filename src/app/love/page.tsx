import { HeartPulse } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { LoveMatch } from "@/components/visitor/LoveMatch";
import { getI18n } from "@/lib/i18n/server";

export default function LovePage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={HeartPulse}
        eyebrow={km ? "សម្រាប់គូស្នេហ៍" : "For couples"}
        title={km ? "ទស្សន៍ទាយស្នេហា" : "Love Match"}
        subtitle={km ? "វាយឈ្មោះអ្នក និងសង្សារ ដាក់រូប ហើយមើលថាស្នេហារបស់អ្នកដូចសត្វគូណានៅសួនសត្វ!" : "Type your names, add your photos, and find out which animal couple at the zoo your love is like!"}
      />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <LoveMatch />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
