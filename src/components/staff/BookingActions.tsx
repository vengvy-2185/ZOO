"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, DoorOpen, Loader2, QrCode, X } from "lucide-react";
import { KhqrCard, drawKhqr } from "@/components/KhqrCard";
import { cn } from "@/lib/utils/cn";

type Item = { name: string; quantity: number };
type Pay = { state: "loading" | "waiting" | "paid" | "error"; img?: string; amount?: number; currency?: string; merchant?: string; left?: number; blocked?: string };

/**
 * Everything a counter needs for one booking, on the same page: details,
 * a KHQR to pay right here (confirmed only by Bakong), and "let in".
 */
export function BookingActions({ code, accessKey, paid, inAt, items, email, km }: { code: string; accessKey: string; paid: boolean; inAt: string | null; items: Item[]; email: string | null; km: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pay, setPay] = useState<Pay | null>(null);
  const [expires, setExpires] = useState<number | null>(null);
  const [letting, setLetting] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [checking, setChecking] = useState(false);

  async function checkNow() {
    setChecking(true);
    const v = await fetch("/api/payments/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "booking", code, key: accessKey, check: true }) })
      .then((r) => r.json())
      .catch(() => null);
    setChecking(false);
    if (v?.status === "paid") {
      setPay({ state: "paid" });
      router.refresh();
    } else setPay((p) => (p ? { ...p, blocked: v?.checkBlocked } : p));
  }
  const L = km
    ? { checkNow: "ភ្ញៀវបង់រួចហើយ · ពិនិត្យឥឡូវ", checking: "កំពុងពិនិត្យ…", limit: "Bakong ឈានដល់ចំនួនពិនិត្យប្រចាំថ្ងៃ។ ប្រាក់បានចូលគណនីរបស់អ្នក ប៉ុន្តែប្រព័ន្ធនឹងបញ្ជាក់ដោយស្វ័យប្រវត្តិ ពេលពិនិត្យលើកដំបូងនៅថ្ងៃស្អែក។", details: "ព័ត៌មានលម្អិត", pay: "បង់ទីនេះ (KHQR)", letIn: "ឲ្យចូល", letting: "កំពុង…", in: "បានឲ្យចូល", scan: "ឲ្យភ្ញៀវស្កេនដោយ app ធនាគារ", wait: "រង់ចាំ Bakong បញ្ជាក់…", paid: "បានទទួលប្រាក់!", close: "បិទ", err: "មិនអាចបង្កើត KHQR បានទេ។", left: "នៅសល់", notInToday: "មិនអាចឲ្យចូលបានទេ (ពិនិត្យថ្ងៃ)" }
    : { checkNow: "Visitor has paid · check now", checking: "Checking…", limit: "Bakong's daily check limit is reached. The money is in your account; the system confirms it automatically at the first check tomorrow.", details: "Details", pay: "Pay here (KHQR)", letIn: "Let in", letting: "…", in: "Let in", scan: "Let the visitor scan with their bank app", wait: "Waiting for Bakong…", paid: "Payment received!", close: "Close", err: "Couldn't make a KHQR.", left: "left", notInToday: "Can't let in (check the date)" };

  async function startPay() {
    setPay({ state: "loading" });
    const v = await fetch("/api/payments/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "booking", code, key: accessKey, regenerate: true }) })
      .then((r) => r.json())
      .catch(() => null);
    if (v?.status === "paid") return setPay({ state: "paid" });
    if (!v?.qr) return setPay({ state: "error" });
    setExpires(v.expiresAt ? Date.parse(v.expiresAt) : null);
    setPay({ state: "waiting", img: await drawKhqr(v.qr, v.logo, v.currency), amount: v.amount, currency: v.currency, merchant: v.merchantName });
  }

  // poll Bakong (through our server) while the QR is showing
  useEffect(() => {
    if (pay?.state !== "waiting") return;
    const id = setInterval(async () => {
      const v = await fetch("/api/payments/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "booking", code, key: accessKey }) })
        .then((r) => r.json())
        .catch(() => null);
      if (v?.status === "paid") {
        setPay({ state: "paid" });
        router.refresh();
      } else if (v) setPay((p) => (p && p.state === "waiting" ? { ...p, blocked: v.checkBlocked } : p));
    }, 3000);
    return () => clearInterval(id);
  }, [pay?.state, code, accessKey, router]);

  // countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (pay?.state !== "waiting") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pay?.state]);
  const secs = expires ? Math.max(0, Math.round((expires - now) / 1000)) : 0;

  async function letIn() {
    setLetting("busy");
    const r = await fetch("/api/tickets/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: code }) })
      .then((x) => x.json())
      .catch(() => null);
    const ok = r?.verdict === "ok" || r?.verdict === "already";
    setLetting(ok ? "done" : "error");
    if (ok) router.refresh();
  }

  return (
    <>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#EEF2FF] py-2 text-xs font-bold text-[#1E3A8A] hover:bg-[#E0E7FF]">
          {L.details} <ChevronDown size={14} className={cn("transition", open && "rotate-180")} />
        </button>
        {!paid && (
          <button type="button" onClick={startPay} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#1D4ED8] py-2 text-xs font-bold text-white hover:bg-[#1E40AF]">
            <QrCode size={13} /> {L.pay}
          </button>
        )}
        {paid && !inAt && (
          <button type="button" onClick={letIn} disabled={letting === "busy" || letting === "done"} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#1D4ED8] py-2 text-xs font-bold text-white hover:bg-[#1E40AF] disabled:opacity-70">
            {letting === "busy" ? <Loader2 size={13} className="animate-spin" /> : letting === "done" ? <CheckCircle2 size={13} /> : <DoorOpen size={13} />} {letting === "done" ? L.in : L.letIn}
          </button>
        )}
      </div>
      {letting === "error" && <p className="mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">{L.notInToday}</p>}
      {open && (
        <div className="mt-2 space-y-1 rounded-xl bg-[#F8FAFF] p-3 text-xs text-ink/70 ring-1 ring-[#2563EB]/10">
          {items.map((i, n) => (
            <p key={n} className="flex justify-between">
              <span>{i.name}</span>
              <b className="text-[#1E3A8A]">× {i.quantity}</b>
            </p>
          ))}
          {email && <p className="truncate pt-1 text-ink/50">{email}</p>}
        </div>
      )}

      {pay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1433]/80 p-4 backdrop-blur-sm" onClick={() => pay.state !== "waiting" && setPay(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {pay.state === "waiting" && pay.img ? (
              <>
                <KhqrCard merchant={pay.merchant ?? "Green Wild Zoo"} amount={pay.amount} currency={pay.currency}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pay.img} alt="KHQR" className="w-full" />
                </KhqrCard>
                <p className="mt-3 text-center text-sm font-bold text-white">{L.scan}</p>
                <p className="mt-1 flex items-center justify-center gap-2 text-center text-xs text-white/70">
                  <Loader2 size={14} className="animate-spin" /> {L.wait} · {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")} {L.left}
                </p>
                <p className="mt-1 text-center font-mono text-xs text-white/50">{code}</p>
                {pay.blocked === "limit" && <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800">{L.limit}</p>}
                <button type="button" onClick={checkNow} disabled={checking} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-extrabold text-[#1E3A8A] shadow-lift disabled:opacity-70">
                  {checking ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {checking ? L.checking : L.checkNow}
                </button>
              </>
            ) : pay.state === "paid" ? (
              <div className="rounded-3xl bg-white p-8 text-center shadow-lift">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1D4ED8] text-white"><CheckCircle2 size={34} /></span>
                <p className="mt-3 font-display text-2xl font-extrabold text-[#1E3A8A]">{L.paid}</p>
                <p className="font-mono text-sm text-ink/50">{code}</p>
              </div>
            ) : pay.state === "error" ? (
              <p className="rounded-2xl bg-white p-6 text-center font-bold text-red-600">{L.err}</p>
            ) : (
              <div className="flex justify-center"><Loader2 size={44} className="animate-spin text-white" /></div>
            )}
            <button type="button" onClick={() => setPay(null)} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/15 py-3 font-bold text-white hover:bg-white/25">
              <X size={16} /> {L.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
