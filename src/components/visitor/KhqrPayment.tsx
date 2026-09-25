"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KhqrCard, drawKhqr } from "@/components/KhqrCard";
import { CheckCircle2, Download, Loader2, RefreshCw, Smartphone, TimerOff, Store, QrCode, Zap, Ticket, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export interface KhqrView {
  status: "pending" | "paid" | "expired" | "unavailable";
  qr?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  merchantName?: string;
  canVerify?: boolean;
  logo?: string;
  payLater?: boolean;
  checkBlocked?: "limit" | "token";
}

const CHOICE = {
  en: {
    how: "How would you like to pay?",
    total: "Total",
    now: "Pay now with KHQR",
    nowText: "Scan with ABA, ACLEDA, Wing or any bank app. Your ticket is ready at once and you walk straight in.",
    fastest: "Fastest",
    later: "Pay at the counter when I arrive",
    laterText: "Your ticket is saved. Show it at the ticket counter and pay there by KHQR.",
    chosen: "Your choice",
    openTicket: "Open my ticket",
    expired: "The QR code expired. Choose again:",
    checkNow: "I've paid · check now",
    checking: "Checking…",
    limit: "Your payment is received by the zoo's bank, but the automatic check is busy today. Your ticket will be confirmed automatically soon (no need to pay again). Keep your booking code.",
    instead: "Pay at the counter instead",
    making: "Making your QR…",
  },
  km: {
    how: "តើអ្នកចង់បង់ប្រាក់របៀបណា?",
    total: "សរុប",
    now: "បង់ឥឡូវនេះតាម KHQR",
    nowText: "ស្កេនដោយ ABA, ACLEDA, Wing ឬ app ធនាគារណាមួយ។ សំបុត្ររួចរាល់ភ្លាម ហើយចូលបានតែម្តង។",
    fastest: "លឿនបំផុត",
    later: "បង់នៅបញ្ជរ ពេលមកដល់",
    laterText: "សំបុត្ររបស់អ្នកត្រូវបានរក្សាទុក។ បង្ហាញវានៅបញ្ជរលក់សំបុត្រ ហើយបង់ទីនោះតាម KHQR។",
    chosen: "ជម្រើសរបស់អ្នក",
    openTicket: "បើកសំបុត្ររបស់ខ្ញុំ",
    expired: "QR ផុតកំណត់ហើយ។ សូមជ្រើសម្តងទៀត៖",
    checkNow: "ខ្ញុំបានបង់រួច · ពិនិត្យឥឡូវ",
    checking: "កំពុងពិនិត្យ…",
    limit: "ប្រាក់របស់អ្នកបានចូលធនាគាររបស់សួនសត្វ ប៉ុន្តែការពិនិត្យស្វ័យប្រវត្តិរវល់ថ្ងៃនេះ។ សំបុត្រនឹងត្រូវបញ្ជាក់ដោយស្វ័យប្រវត្តិឆាប់ៗ (មិនបាច់បង់ម្តងទៀតទេ)។ សូមរក្សាលេខកូដកក់របស់អ្នក។",
    instead: "បង់នៅបញ្ជរជំនួសវិញ",
    making: "កំពុងបង្កើត QR…",
  },
};

// KHQR payment card (styled after the official KHQR layout: red header,
// merchant, amount, QR). Polls the server every 3 s; the server asks Bakong
// whether the QR has been paid and redirects once it has.
export function KhqrPayment({
  kind,
  code,
  accessKey,
  initial,
  successHref,
  ticketHref,
  total,
  autoNow = false,
}: {
  kind: "booking" | "adoption";
  code: string;
  accessKey: string;
  initial: KhqrView;
  successHref: string;
  /** where "pay at the counter" leads (bookings only) */
  ticketHref?: string;
  total?: number;
  /** skip the question and make the QR straight away */
  autoNow?: boolean;
}) {
  const { t, locale } = useI18n();
  const C = CHOICE[locale === "km" ? "km" : "en"];
  const router = useRouter();
  const [view, setView] = useState<KhqrView>(initial);
  const [img, setImg] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const stopped = useRef(false);
  const hadQr = useRef(Boolean(initial.qr));
  const [making, setMaking] = useState(false);
  const [laterBusy, setLaterBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const canLater = kind === "booking" && Boolean(ticketHref);

  const poll = useCallback(
    async (regenerate = false, check = false) => {
      const res = await fetch("/api/payments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, code, key: accessKey, regenerate, check }),
      });
      if (!res.ok) return;
      const next = (await res.json()) as KhqrView;
      setView((v) => (next.status === "pending" && !next.qr ? { ...v, ...next, qr: v.qr } : next));
    },
    [kind, code, accessKey]
  );

  // QR image
  useEffect(() => {
    if (view.qr) {
      hadQr.current = true;
      drawKhqr(view.qr, view.logo, view.currency).then(setImg);
    }
  }, [view.qr, view.logo, view.currency]);

  // Countdown
  useEffect(() => {
    if (!view.expiresAt) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(view.expiresAt!).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [view.expiresAt]);

  // Poll while pending (also a little after expiry, in case it was paid at the last second)
  useEffect(() => {
    if (view.status !== "pending" || stopped.current) return;
    const id = setInterval(() => poll(), 3000);
    return () => clearInterval(id);
  }, [view.status, poll]);

  // Online payment not set up yet: quietly check again (a QR appears as soon as the admin connects Bakong).
  useEffect(() => {
    if (view.status !== "unavailable") return;
    const id = setInterval(() => poll(true), 15000);
    return () => clearInterval(id);
  }, [view.status, poll]);

  useEffect(() => {
    if (view.status === "paid") {
      stopped.current = true;
      const id = setTimeout(() => router.push(successHref), 1800);
      return () => clearTimeout(id);
    }
  }, [view.status, router, successHref]);

  async function payNow() {
    setMaking(true);
    if (view.payLater && canLater) {
      fetch("/api/payments/later", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, key: accessKey, later: false }) }).catch(() => {});
    }
    await poll(true);
    setMaking(false);
  }

  async function payLater() {
    setLaterBusy(true);
    await fetch("/api/payments/later", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, key: accessKey, later: true }) }).catch(() => {});
    router.push(ticketHref!);
  }

  // Make the QR straight away when asked to (e.g. "Pay now" from the ticket page, or adoptions).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if ((autoNow || !canLater) && !initial.qr && initial.status === "expired") payNow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (view.status === "unavailable") {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
          <Store size={30} />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-forest">{t.pay.unavailable}</h2>
        <p className="mt-2 text-sm text-ink/60">{t.pay.unavailableText}</p>
        <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm">
          {t.pay.orderRef}: <span className="font-mono text-base font-bold text-forest">{code}</span>
        </div>
      </div>
    );
  }

  if (view.status === "paid") {
    return (
      <div className="card mx-auto max-w-sm p-8 text-center animate-[payOk_.5s_ease]">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lift">
          <CheckCircle2 size={44} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-forest">{t.pay.paid}</h2>
        <p className="mt-1 text-sm text-ink/60">{t.pay.paidText}</p>
        <style>{`@keyframes payOk{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}`}</style>
      </div>
    );
  }

  // No live QR yet (or it ran out): ask how they want to pay.
  if (!view.qr && view.status === "expired") {
    const busyNow = making || ((autoNow || !canLater) && !hadQr.current);
    return (
      <div className="mx-auto max-w-2xl">
        {hadQr.current && <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{C.expired}</p>}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold text-forest">{C.how}</h2>
          {total != null && (
            <span className="rounded-full bg-light-green px-4 py-1.5 font-display text-lg font-extrabold text-primary">
              {C.total}: ${total.toFixed(2)}
            </span>
          )}
        </div>
        <div className={canLater ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
          <button
            type="button"
            onClick={payNow}
            disabled={busyNow || laterBusy}
            className="group relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#E1232E] to-[#B3141E] p-5 text-left text-white shadow-lift transition hover:-translate-y-0.5 disabled:opacity-90"
          >
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">
              <Zap size={12} /> {C.fastest}
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              {busyNow ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
            </span>
            <span className="mt-3 block font-display text-xl font-extrabold">{busyNow ? C.making : C.now}</span>
            <span className="mt-1 block text-sm text-white/85">{C.nowText}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold">
              KHQR <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </span>
          </button>
          {canLater && (
            <button
              type="button"
              onClick={payLater}
              disabled={busyNow || laterBusy}
              className={`group relative rounded-[1.6rem] bg-white p-5 text-left shadow-soft ring-2 transition hover:-translate-y-0.5 ${view.payLater ? "ring-primary" : "ring-black/5 hover:ring-primary/40"}`}
            >
              {view.payLater && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white">
                  <CheckCircle2 size={12} /> {C.chosen}
                </span>
              )}
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-primary">
                {laterBusy ? <Loader2 size={24} className="animate-spin" /> : <Store size={24} />}
              </span>
              <span className="mt-3 block font-display text-xl font-extrabold text-forest">{C.later}</span>
              <span className="mt-1 block text-sm text-ink/60">{C.laterText}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-primary">
                <Ticket size={15} /> {C.openTicket} <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </span>
            </button>
          )}
        </div>
        <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-center text-sm text-ink/60">
          {t.pay.orderRef}: <span className="font-mono font-bold text-forest">{code}</span>
        </div>
      </div>
    );
  }

  const expired = view.status === "expired" || (view.expiresAt && left === 0);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto grid max-w-3xl items-start gap-6 md:grid-cols-[340px_1fr]">
      {/* KHQR card */}
      <KhqrCard
        merchant={view.merchantName ?? "Green Wild Zoo"}
        amount={view.amount}
        currency={view.currency}
        footer={
        <div className="border-t border-black/5 bg-cream px-6 py-3 text-center text-sm font-bold">
          {expired ? (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await poll(true);
                setBusy(false);
              }}
              className="btn-primary w-full py-2.5 hover:translate-y-0"
            >
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {t.pay.newQr}
            </button>
          ) : (
            <span className={left < 60 ? "text-red-600" : "text-forest"}>{t.pay.expiresIn(`${mm}:${ss}`)}</span>
          )}
        </div>
        }
      >
        <div className="relative">
          {img && !expired ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="KHQR" className="mx-auto w-full max-w-[260px]" />
          ) : (
            <div className="mx-auto flex aspect-square w-full max-w-[260px] flex-col items-center justify-center gap-3 rounded-2xl bg-black/[0.04] text-center text-ink/55">
              {expired ? <TimerOff size={40} /> : <Loader2 size={32} className="animate-spin" />}
              {expired && <span className="px-6 text-sm font-semibold">{t.pay.expired}</span>}
            </div>
          )}
        </div>

      </KhqrCard>
      {!expired && (
        <div className="space-y-2 md:col-start-1">
          {view.checkBlocked === "limit" && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{C.limit}</p>}
          <button
            type="button"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              await poll(false, true);
              setChecking(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-extrabold text-primary shadow-soft ring-1 ring-primary/20 disabled:opacity-70"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {checking ? C.checking : C.checkNow}
          </button>
        </div>
      )}
      {canLater && !expired && (
        <button type="button" onClick={payLater} disabled={laterBusy} className="mx-auto -mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline md:col-start-1">
          {laterBusy ? <Loader2 size={15} className="animate-spin" /> : <Store size={15} />} {C.instead}
        </button>
      )}

      {/* Instructions + live status */}
      <div className="space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <div>
            <div className="font-bold text-forest">{t.pay.waiting}</div>
            <div className="text-xs text-ink/55">{t.pay.checking}</div>
          </div>
        </div>
        <ol className="card space-y-3 p-5">
          {t.pay.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm text-ink/75">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-light-green font-display font-bold text-primary">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink/50">
          <Smartphone size={14} /> ABA, ACLEDA, Wing, Bakong, Canadia, Prince
        </div>
        {img && !expired && (
          <a href={img} download={`KHQR-${code}.png`} className="btn-outline w-full sm:w-auto">
            <Download size={16} /> {t.pay.save}
          </a>
        )}
        <div className="text-xs text-ink/45">
          {t.pay.orderRef}: <span className="font-mono font-bold text-ink/70">{code}</span>
        </div>
      </div>
    </div>
  );
}
