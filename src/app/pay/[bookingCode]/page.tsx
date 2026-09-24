import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { KhqrPayment } from "@/components/visitor/KhqrPayment";
import { pollKhqr } from "@/lib/server/payments";
import { getI18n } from "@/lib/i18n/server";
import { RememberTicket } from "@/components/visitor/MyTickets";

// KHQR payment page for a ticket booking. `k` is the booking's secret key
// (given only to the person who created it at checkout).
export default async function PayBookingPage({ params, searchParams }: { params: { bookingCode: string }; searchParams: { k?: string } }) {
  const key = searchParams.k ?? "";
  if (!/^[a-f0-9]{16,64}$/i.test(key)) notFound();
  const view = await pollKhqr("booking", params.bookingCode, key);
  if (!view) notFound();
  const { t } = getI18n();

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
        />
      </main>
      <BottomNav />
    </div>
  );
}
