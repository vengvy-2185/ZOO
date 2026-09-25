import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users, Ticket, Wallet, CheckCircle2, Download, ArrowLeft, Clock, ScanLine, Sun, Store } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { LogoMark } from "@/components/visitor/Logo";
import { generateQrDataUrl } from "@/lib/utils/qr";
import { formatFullDate, num } from "@/lib/utils/age";
import { getI18n } from "@/lib/i18n/server";
import { getBranding } from "@/lib/branding";
import { OPENING } from "@/lib/data/events";
import { RememberTicket } from "@/components/visitor/MyTickets";
import { ScratchCard } from "@/components/visitor/ScratchCard";
import { getSiteUrl } from "@/lib/server/site-url";
import { AddToCalendar } from "@/components/visitor/AddToCalendar";
import { GateVerdict, VisitorScanNote } from "@/components/visitor/GateVerdict";
import { checkInTicket, type ScanOutcome } from "@/lib/server/checkin";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { existingPrize } from "@/lib/server/scratch";

// Signed-in owners (and staff/admin) can read their booking through RLS.
// Guests have no session, so they present the ticket's secret key (`k`,
// the booking's random qr_token, handed out only at checkout) and the
// server looks the booking up with the service role — requiring BOTH the
// booking code and that key, so a guessed booking code alone reveals nothing.
async function getBooking(bookingCode: string, accessKey?: string) {
  const select = "*, booking_items(*, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)";
  const supabase = createClient();
  const { data: own } = await supabase.from("bookings").select(select).eq("booking_code", bookingCode).maybeSingle();
  if (own) return own;

  if (!accessKey || !/^[a-f0-9]{16,64}$/i.test(accessKey)) return null;
  const admin = createServiceRoleClient();
  const { data: guest } = await admin
    .from("bookings")
    .select(select)
    .eq("booking_code", bookingCode)
    .eq("qr_token", accessKey)
    .maybeSingle();
  return guest;
}

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: { bookingCode: string };
  searchParams: { success?: string; k?: string; s?: string; force?: string };
}) {
  // s=1 means this page was opened by scanning the ticket's QR code. If the
  // person scanning is zoo staff (or an admin), that scan checks the ticket in,
  // just like the staff scanner. Anyone else only sees the ticket.
  const scanned = searchParams.s === "1" && !!searchParams.k;
  let gate: ScanOutcome | null = null;
  if (scanned) {
    const user = await getSessionUser();
    const role = user ? (await getCachedRole(user.id)).role : null;
    if (user && (role === "staff" || role === "admin")) gate = await checkInTicket(searchParams.k!, user.id, searchParams.force === "1");
  }
  const booking = await getBooking(params.bookingCode, searchParams.k);
  if (!booking) notFound();

  const { locale, t } = getI18n();
  const T = t.ticket;
  const km = locale === "km";
  // The QR holds the ticket link: staff scanners read the key from it, and a
  // visitor's own phone camera simply opens this page.
  const siteUrl = getSiteUrl();
  const shareableUrl = `/ticket/${booking.booking_code}?k=${booking.qr_token}`;
  const scanUrl = `${shareableUrl}&s=1`;
  const [qrDataUrl, { heroImageUrl }, prize] = await Promise.all([generateQrDataUrl(siteUrl ? `${siteUrl}${scanUrl}` : booking.qr_token, true), getBranding(), existingPrize(booking.scratch_code_id)]);
  const items = (booking.booking_items ?? []) as any[];
  const totalVisitors = items.reduce((s: number, i: any) => s + i.quantity, 0);
  // One-to-one since each booking can be checked in once (object, or array on older schemas).
  const checkin = [booking.visitor_checkins].flat()[0] as { checked_in_at?: string } | undefined;
  const usedAt = checkin?.checked_in_at;
  const paid = booking.status === "confirmed";
  const state = usedAt ? "used" : booking.status;
  const badge =
    state === "used" ? "bg-white/20 text-white" : paid ? "bg-leaf text-forest" : booking.status === "pending" ? "bg-[#E1232E] text-white" : "bg-black/30 text-white";
  const time = (iso: string) =>
    new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-8">
        {gate ? (
          <GateVerdict out={gate} km={km} time={time} forceHref={`${scanUrl}&force=1`} payHref={`/pay/${booking.booking_code}?k=${booking.qr_token}&now=1`} />
        ) : (
          <RememberTicket code={booking.booking_code} k={booking.qr_token} />
        )}
        {scanned && !gate && paid && <VisitorScanNote km={km} />}
        {searchParams.success && paid && (
          <div className="mb-5 flex items-center gap-3 rounded-3xl bg-primary p-4 text-white shadow-lift">
            <CheckCircle2 size={28} className="flex-shrink-0 text-leaf" />
            <div>
              <div className="font-display text-lg font-bold">{T.success}</div>
              <div className="text-sm text-white/80">{T.successText}</div>
            </div>
          </div>
        )}

        {booking.status === "pending" && booking.pay_later && (
          <div className="mb-5 overflow-hidden rounded-3xl bg-white shadow-lift ring-2 ring-primary/20">
            <div className="flex items-center gap-3 bg-light-green p-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <Wallet size={24} />
              </span>
              <div>
                <div className="font-display text-lg font-extrabold text-forest">{km ? "បង់នៅបញ្ជរ ពេលមកដល់" : "Pay at the counter when you arrive"}</div>
                <div className="text-sm text-ink/65">
                  {km
                    ? `បង្ហាញ QR សំបុត្រខាងក្រោមនៅបញ្ជរ។ បុគ្គលិកនឹងបង្ហាញ KHQR ឲ្យអ្នកស្កេនបង់ $${Number(booking.total_usd).toFixed(2)}។`
                    : `Show the ticket QR below at the counter. Staff will show you a KHQR to pay $${Number(booking.total_usd).toFixed(2)}.`}
                </div>
              </div>
            </div>
            <Link href={`/pay/${booking.booking_code}?k=${booking.qr_token}&now=1`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-extrabold text-[#E1232E] hover:bg-red-50">
              {km ? "ឬបង់ឥឡូវនេះ ដើម្បីចូលលឿនជាង" : "Or pay now and skip the queue"} <span className="rounded-full bg-[#E1232E] px-3 py-1 text-xs text-white">KHQR</span>
            </Link>
          </div>
        )}

        {booking.status === "pending" && !booking.pay_later && (
          <Link
            href={`/pay/${booking.booking_code}?k=${booking.qr_token}`}
            className="mb-5 flex items-center gap-3 rounded-3xl bg-[#E1232E] p-4 text-white shadow-lift transition hover:brightness-110"
          >
            <Wallet size={26} className="flex-shrink-0" />
            <div className="flex-1">
              <div className="font-display text-lg font-bold">{t.pay.title}</div>
              <div className="text-sm text-white/85">{T.unpaidHint}</div>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#E1232E]">KHQR</span>
          </Link>
        )}

        {/* ── Ticket ── */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5">
          {/* Header with park photo */}
          <div className="relative h-40 overflow-hidden">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-forest/95 via-primary/80 to-forest/60" />
            <div className="relative flex h-full flex-col justify-between p-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <LogoMark className="h-11 w-11" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-leaf">{T.digitalTicket}</div>
                    <div className="font-display text-xl font-extrabold leading-tight">Green Wild Zoo</div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${badge}`}>{T.status[state] ?? state}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{T.visitDate}</div>
                  <div className="font-display text-2xl font-extrabold">{formatFullDate(booking.visit_date, locale) ?? booking.visit_date}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{T.admitOne}</div>
                  <div className="font-display text-2xl font-extrabold">
                    {num(totalVisitors, locale)} <span className="text-base">{T.people}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="px-6 pb-3 pt-6 text-center">
            <div className="relative mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Ticket QR code" className={`h-60 w-60 rounded-3xl p-3 ring-4 ${paid && !usedAt ? "ring-leaf" : booking.pay_later && !usedAt ? "ring-primary/40" : "ring-black/10"} ${usedAt || (!paid && !booking.pay_later) ? "opacity-35 grayscale" : ""}`} />
              <span className={`pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white shadow-soft ${usedAt || (!paid && !booking.pay_later) ? "opacity-35 grayscale" : ""}`}>
                <LogoMark className="h-11 w-11" />
              </span>
              {usedAt && (
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-xl border-4 border-primary bg-white/90 px-4 py-1.5 font-display text-2xl font-extrabold uppercase text-primary">
                  {T.usedAt} ✓
                </span>
              )}
            </div>
            {paid && !usedAt && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-forest">
                <ScanLine size={17} className="text-primary" /> {T.showAtGate}
              </p>
            )}
            {usedAt && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-primary">
                <CheckCircle2 size={16} /> {T.usedAt} · {time(usedAt)}
              </p>
            )}
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink/45">{T.bookingId}</div>
            <div className="font-mono text-2xl font-extrabold tracking-widest text-forest">{booking.booking_code}</div>
          </div>

          {/* perforation */}
          <div className="relative my-3 flex items-center">
            <span className="absolute -left-4 h-8 w-8 rounded-full bg-light-green" />
            <span className="mx-6 w-full border-t-2 border-dashed border-black/10" />
            <span className="absolute -right-4 h-8 w-8 rounded-full bg-light-green" />
          </div>

          {/* Details */}
          <div className="space-y-3 px-6 pb-6 pt-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {items.map((i: any) => (
                <span key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary">
                  <Ticket size={13} /> {(km && i.ticket_types?.khmer_name) || i.ticket_types?.name} × {num(i.quantity, locale)}
                </span>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-cream p-4">
              <Row icon={Users} label={T.name} value={booking.visitor_name ?? "—"} />
              <Row icon={Wallet} label={T.total} value={`$${Number(booking.total_usd).toFixed(2)}`} />
              <Row icon={Clock} label={t.visit.openingHours} value={`${OPENING.open} – ${OPENING.close}`} />
              <Row icon={CalendarDays} label={T.visitors} value={num(totalVisitors, locale)} />
            </dl>
            {!usedAt && booking.status !== "cancelled" && (
              <AddToCalendar date={booking.visit_date} code={booking.booking_code} url={`${siteUrl}${shareableUrl}`} km={km} />
            )}
            {paid && !usedAt && (
              <p className="flex items-start gap-2 text-xs text-ink/55">
                <Sun size={14} className="mt-0.5 flex-shrink-0 text-accent" /> {T.scanHint}
              </p>
            )}
          </div>
        </div>

        {/* One scratch card per paid ticket: a discount for the next visit */}
        {paid && <ScratchCard bookingCode={booking.booking_code} accessKey={booking.qr_token} initial={prize} />}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a href={qrDataUrl} download={`${booking.booking_code}.png`} className="btn-outline bg-white">
            <Download size={16} /> {T.saveQr}
          </a>
          <Link href={shareableUrl} className="btn-primary hover:translate-y-0">
            <Ticket size={16} /> {T.ticketLink}
          </Link>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-xs text-ink/55 ring-1 ring-black/5">
          <Store size={14} className="mt-0.5 flex-shrink-0 text-primary" /> {T.walkIn}
        </p>
        <Link href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary">
          <ArrowLeft size={15} /> {t.common.backToZoo}
        </Link>
      </main>
      <BottomNav />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <Icon size={17} className="mt-0.5 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</dt>
        <dd className="truncate font-semibold text-forest">{value}</dd>
      </div>
    </div>
  );
}
