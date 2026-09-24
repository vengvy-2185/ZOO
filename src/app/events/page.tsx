import { CalendarClock } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { EventsSchedule } from "@/components/visitor/EventsSchedule";
import { getI18n } from "@/lib/i18n/server";

export default function EventsPage() {
  const { t } = getI18n();
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={CalendarClock} eyebrow={t.extra.eventsEyebrow} title={t.extra.eventsTitle} subtitle={t.extra.eventsSubtitle} />
      <main className="mx-auto max-w-4xl px-4 md:px-6">
        <EventsSchedule />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
