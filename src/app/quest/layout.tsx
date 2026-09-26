import { Trophy } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { QuestTabs } from "@/components/visitor/QuestTabs";
import { getI18n } from "@/lib/i18n/server";

// The quest page itself is a client component (it reads the visitor's quest
// session from localStorage), so the server-rendered site chrome lives here.
export default function QuestLayout({ children }: { children: React.ReactNode }) {
  const { t } = getI18n();
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Trophy}
        eyebrow={t.quest.eyebrow}
        title={t.quest.title}
        subtitle={t.quest.subtitle}
      />
      <QuestTabs active="quest" />
      {children}
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
