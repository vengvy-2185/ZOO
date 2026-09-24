import { Ticket } from "lucide-react";
import { getTicketTypes } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { TicketSelector } from "@/components/visitor/TicketSelector";
import type { TicketType } from "@/types/domain";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 60;

export default async function TicketsPage({ searchParams }: { searchParams: { date?: string } }) {
  const ticketTypes = await getTicketTypes();
  const { t } = getI18n();

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Ticket}
        eyebrow={t.tickets.eyebrow}
        title={t.tickets.title}
        subtitle={t.tickets.subtitle}
      />
      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <TicketSelector ticketTypes={(ticketTypes ?? []) as TicketType[]} initialDate={searchParams.date} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
