import { CircleHelp, Phone } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { FaqList } from "@/components/visitor/FaqList";
import { getSettings } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

export default async function FaqPage() {
  const { t } = getI18n();
  const { zooProfile } = await getSettings().catch(() => ({ zooProfile: {} as Record<string, any> }));
  const phone: string = zooProfile.phone || "+855 00 000 000";

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={CircleHelp} eyebrow={t.faq.eyebrow} title={t.faq.title} subtitle={t.faq.subtitle} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <FaqList />
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-primary to-forest p-6 text-white shadow-lift">
          <p className="font-display text-xl font-bold">{t.faq.stillQuestions}</p>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-primary">
            <Phone size={16} /> {t.faq.call} {phone}
          </a>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
