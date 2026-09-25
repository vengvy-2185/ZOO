import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { KhqrPayment } from "@/components/visitor/KhqrPayment";
import { pollKhqr } from "@/lib/server/payments";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { RememberTicket } from "@/components/visitor/MyTickets";

// KHQR payment page for a ticket booking. `k` is the booking's secret key
// (given only to the person who created it at checkout).
export default async function PayBookingPage({ params, searchParams }: { params: { bookingCode: string }; searchParams: { k?: string; now?: string } }) {
  const key = searchParams.k ?? "";
  if (!/^[a-f0-9]{16,64}$/i.test(key)) notFound();
  const view = await pollKhqr("booking", params.bookingCode, key, { skipCheck: true });
  if (!view) notFound();
  const { t } = getI18n();
  const { data: b } = await createServiceRoleClient().from("bookings").select("total_usd").eq("booking_code", params.bookingCode).eq("qr_token", key).maybeSingle();

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <Navbar />
      <PageHeader icon={QrCode} eyebrow="Bakong KHQR" title={t.pay.title} subtitle={t.pay.subtitle} />
      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <RememberTicket code={params.bookingCode} k={key} />
        <KhqrPayment
          kind="booking"
          code={params.bookingCode}
          accessKey={key}
          initial={view}
          successHref={`/ticket/${params.bookingCode}?success=1&k=${key}`}
          ticketHref={`/ticket/${params.bookingCode}?k=${key}`}
          total={b ? Number(b.total_usd) : undefined}
          autoNow={searchParams.now === "1"}
        />
      </main>
      <BottomNav />
    </div>
  );
}
