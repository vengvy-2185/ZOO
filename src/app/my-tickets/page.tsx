import { Ticket } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { MyTicketsList, type TicketSummary } from "@/components/visitor/MyTickets";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MyTicketsPage() {
  const { t } = getI18n();
  const me = await getSessionUser();
  let fromAccount: TicketSummary[] = [];
  if (me) {
    // Signed in: RLS returns only this visitor's own bookings.
    const { data } = await createClient()
      .from("bookings")
      .select("booking_code, qr_token, visit_date, status, total_usd, booking_items(quantity), visitor_checkins(checked_in_at)")
      .eq("visitor_id", me.id)
      .order("visit_date", { ascending: false });
    fromAccount = ((data ?? []) as any[]).map((b) => ({
      code: b.booking_code,
      k: b.qr_token,
      visitDate: b.visit_date,
      status: b.status,
      total: Number(b.total_usd),
      visitors: (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
      usedAt: ([b.visitor_checkins].flat()[0] as any)?.checked_in_at ?? null,
    }));
  }

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Ticket} eyebrow={t.nav.tickets} title={t.nav.myTickets} subtitle={t.account.myTicketsHint} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <MyTicketsList fromAccount={fromAccount} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
