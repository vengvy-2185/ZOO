import { CalendarDays } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { KhmerCalendarView } from "@/components/KhmerCalendarView";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "ប្រតិទិនខ្មែរ" : "Khmer Calendar" };
}

/** The Khmer lunar calendar with Cambodian holidays, for visitors planning a day out. */
export default function CalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const today = zooToday();
  const m = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : today.slice(0, 7);
  const [year, month] = m.split("-").map(Number);
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={CalendarDays}
        eyebrow={km ? "ចន្ទគតិ និងថ្ងៃបុណ្យ" : "Lunar days and holidays"}
        title={km ? "ប្រតិទិនខ្មែរ" : "Khmer Calendar"}
        subtitle={km ? "ថ្ងៃចន្ទគតិ ថ្ងៃសីល និងថ្ងៃបុណ្យជាតិខ្មែរ រៀងរាល់ខែ។" : "Lunar days, holy days and Cambodian holidays, month by month."}
      />
      <main className="mx-auto max-w-5xl px-3 pb-12 md:px-6">
        <KhmerCalendarView year={year} month={month} today={today} km={km} basePath="/calendar" />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
