"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Mail, CalendarDays, Lock, ArrowRight, Ticket, TicketPercent, Loader2, X, CheckCircle2, Star, BadgePercent } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Quote = {
  subtotal: number;
  code: { ok: true; code: string; amount: number; name: string; nameKm: string | null } | { ok: false; reason: string; min?: number } | null;
  pointsBalance: number | null;
  pointsUsed: number;
  pointsDiscount: number;
  totalDiscount: number;
  total: number;
};

const PTS = {
  en: {
    discounts: "Discounts",
    usePoints: "Use my points",
    have: (n: number) => `You have ${n} points`,
    uses: (n: number, d: string) => `Uses ${n} points to take off ${d}`,
    rule: "200 points = $1. Points can pay up to half the price.",
    none: "No points yet. Earn them in the Animal Quest or by inviting friends.",
    signIn: "Sign in to use your points",
    codeLine: "Code discount",
    pointsLine: "Points discount",
    totalOff: "Total discount",
    toPay: "Amount to pay",
    saved: (d: string) => `You save ${d}`,
    pointsError: "Your points changed. Please check the total and try again.",
    fromAccount: "From your account",
    change: "Change",
  },
  km: {
    discounts: "ការបញ្ចុះតម្លៃ",
    usePoints: "ប្រើពិន្ទុរបស់ខ្ញុំ",
    have: (n: number) => `អ្នកមាន ${n} ពិន្ទុ`,
    uses: (n: number, d: string) => `ប្រើ ${n} ពិន្ទុ ដើម្បីបញ្ចុះ ${d}`,
    rule: "200 ពិន្ទុ = $1។ ពិន្ទុអាចបង់បានរហូតដល់ពាក់កណ្តាលតម្លៃ។",
    none: "មិនទាន់មានពិន្ទុទេ។ ប្រមូលបានពីបេសកកម្មសត្វ ឬអញ្ជើញមិត្ត។",
    signIn: "ចូលគណនីដើម្បីប្រើពិន្ទុ",
    codeLine: "បញ្ចុះតាមកូដ",
    pointsLine: "បញ្ចុះតាមពិន្ទុ",
    totalOff: "បញ្ចុះសរុប",
    toPay: "ប្រាក់ត្រូវបង់",
    saved: (d: string) => `អ្នកសន្សំបាន ${d}`,
    pointsError: "ពិន្ទុរបស់អ្នកបានប្រែប្រួល។ សូមពិនិត្យតម្លៃ ហើយព្យាយាមម្តងទៀត។",
    fromAccount: "ពីគណនីរបស់អ្នក",
    change: "កែប្រែ",
  },
};
const usd = (n: number) => `$${n.toFixed(2)}`;
import { useI18n } from "@/lib/i18n/client";
import { formatFullDate, num } from "@/lib/utils/age";

interface CartItem { ticket_type_id: string; name: string; price: number; quantity: number }
interface Cart { visitDate: string; items: CartItem[]; subtotal: number }

const VISITOR_KEY = "gwz_visitor";

export function CheckoutClient({ me }: { me: { name: string; email: string } }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  // With an account the details show as a card; "Change" turns it back into inputs.
  const [editing, setEditing] = useState(!me?.name || !me?.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Discount code: typed text, the applied result, and its own status message.
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; amount: number; name: string } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [q, setQ] = useState<Quote | null>(null);
  const P = PTS[locale === "km" ? "km" : "en"];

  // Ask the server for the real prices whenever the code or the points switch changes.
  async function fetchQuote(code: string | null, pts: boolean) {
    if (!cart) return null;
    const res = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items.map((i) => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })), code, usePoints: pts }),
    });
    if (!res.ok) return null;
    const data: Quote = await res.json();
    setQ(data);
    return data;
  }
  useEffect(() => {
    if (cart) fetchQuote(applied?.code ?? null, usePoints).catch(() => {});
  }, [cart, applied?.code, usePoints]); // eslint-disable-line react-hooks/exhaustive-deps

  const reasonText = (r: any) => {
    const e = t.checkout.discountErrors;
    if (r?.reason === "min_total") return e.min_total(Number(r.min ?? 0));
    return (e as any)[r?.reason] ?? e.invalid;
  };

  async function applyCode() {
    if (!cart || !codeInput.trim()) return;
    setChecking(true);
    setCodeMsg(null);
    try {
      const r = await fetchQuote(codeInput.trim(), usePoints);
      if (r?.code?.ok) setApplied({ code: r.code.code, amount: r.code.amount, name: (locale === "km" && r.code.nameKm) || r.code.name });
      else {
        setApplied(null);
        setCodeMsg(reasonText(r?.code ?? { reason: "invalid" }));
      }
    } catch {
      setCodeMsg(t.checkout.failed);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("gwz_cart");
    if (raw) setCart(JSON.parse(raw));
    // Guests: fill in what they typed last time on this device.
    if (!me) {
      try {
        const v = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? "null");
        if (v?.name) setName(v.name);
        if (v?.email) setEmail(v.email);
      } catch {}
    }
    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart) return;
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(VISITOR_KEY, JSON.stringify({ name, email }));
    } catch {}
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitDate: cart.visitDate,
          visitorName: name,
          visitorEmail: email,
          items: cart.items.map((i) => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })),
          discountCode: applied?.code,
          usePoints,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // signed out in another tab: sign in again, the cart stays in this tab
        router.push("/account/login?next=/checkout");
        return;
      }
      if (res.status === 409 && data.error === "discount") {
        setApplied(null);
        setCodeMsg(reasonText(data));
        throw new Error(reasonText(data));
      }
      if (res.status === 409 && data.error === "points") {
        setUsePoints(false);
        throw new Error(P.pointsError);
      }
      if (!res.ok) throw new Error(data.error ?? t.checkout.failed);
      sessionStorage.removeItem("gwz_cart");
      // `k` lets a guest (not signed in) open their own ticket — see /ticket/[bookingCode].
      const k = encodeURIComponent(data.accessKey);
      // Paid tickets go to the KHQR page; free ones straight to the ticket.
      router.push(data.payWith === "khqr" ? `/pay/${data.bookingCode}?k=${k}` : `/ticket/${data.bookingCode}?success=1&k=${k}`);
    } catch (err: any) {
      setError(err.message ?? t.checkout.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold text-forest md:text-4xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <ShoppingBag size={24} />
          </span>
          {t.checkout.title}
        </h1>

        {ready && !cart ? (
          <div className="card mt-8 p-10 text-center">
            <Ticket size={36} className="mx-auto text-primary" />
            <p className="mt-3 text-ink/60">{t.checkout.emptyCart}</p>
            <Link href="/tickets" className="btn-primary mt-5">
              {t.checkout.chooseTickets} <ArrowRight size={16} />
            </Link>
          </div>
        ) : cart ? (
          <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <form onSubmit={submit} className="card space-y-4 p-6">
              <h2 className="font-display text-xl font-bold text-forest">{t.checkout.yourDetails}</h2>
              {!editing ? (
                <div className="flex items-center gap-3 rounded-3xl bg-light-green/60 p-4 ring-1 ring-primary/15">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-white">
                    {name.trim().charAt(0).toUpperCase() || <User size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{P.fromAccount}</p>
                    <p className="truncate font-display font-bold text-forest">{name}</p>
                    <p className="truncate text-sm text-ink/60">{email}</p>
                  </div>
                  <button type="button" onClick={() => setEditing(true)} className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-soft hover:bg-cream">
                    {P.change}
                  </button>
                </div>
              ) : (
              <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.visitorName}</span>
                <div className="relative">
                  <User size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="input pl-11" />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.email}</span>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-11" />
                </div>
              </label>
              </>
              )}
              <div className="space-y-3 rounded-3xl bg-cream p-4 ring-1 ring-primary/10">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
                  <BadgePercent size={20} className="text-primary" /> {P.discounts}
                </p>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.discountLabel}</span>
                {applied ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-light-green px-4 py-3 text-sm font-bold text-primary animate-[gwzPop_.3s_ease]">
                    <CheckCircle2 size={18} />
                    <span className="flex-1">
                      {t.checkout.discountApplied(applied.name)} <span className="font-mono">({applied.code})</span>
                    </span>
                    <button type="button" onClick={() => setApplied(null)} className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-red-600">
                      <X size={14} /> {t.checkout.remove}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TicketPercent size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                      <input
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCode();
                          }
                        }}
                        placeholder={t.checkout.discountPlaceholder}
                        className="input pl-11 font-mono uppercase tracking-wider"
                      />
                    </div>
                    <button type="button" onClick={applyCode} disabled={checking || !codeInput.trim()} className="btn-outline px-5 disabled:opacity-50">
                      {checking ? <Loader2 size={16} className="animate-spin" /> : t.checkout.apply}
                    </button>
                  </div>
                )}
                {codeMsg && <p className="mt-2 text-xs font-semibold text-red-600">{codeMsg}</p>}

                {/* Points */}
                <div className="border-t border-dashed border-black/10 pt-3">
                  {q?.pointsBalance == null ? (
                    <Link href="/account/login?next=/checkout" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                      <Star size={16} /> {P.signIn}
                    </Link>
                  ) : q.pointsBalance <= 0 ? (
                    <p className="flex items-start gap-2 text-sm text-ink/55">
                      <Star size={16} className="mt-0.5 flex-shrink-0 text-accent" /> {P.none}
                    </p>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-bold text-forest">
                          <Star size={16} className="text-accent" /> {P.usePoints}
                        </span>
                        <span className="block text-xs text-ink/55">
                          {usePoints && q.pointsUsed > 0 ? P.uses(q.pointsUsed, usd(q.pointsDiscount)) : P.have(q.pointsBalance)}
                        </span>
                        <span className="block text-[11px] text-ink/40">{P.rule}</span>
                      </span>
                      <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="peer sr-only" />
                      <span className="relative h-7 w-12 flex-shrink-0 rounded-full bg-black/15 transition peer-checked:bg-primary after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                    </label>
                  )}
                </div>
              </div>
              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button disabled={loading || !name || !email} className="btn-primary w-full py-3.5 text-base hover:translate-y-0">
                <Lock size={16} /> {loading ? t.checkout.processing : t.checkout.pay}
              </button>
              <p className="text-center text-xs text-ink/45">{t.checkout.demoNote}</p>
            </form>

            <aside className="card h-fit p-6">
              <h2 className="font-display text-xl font-bold text-forest">{t.checkout.summary}</h2>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-light-green px-3 py-2 text-sm font-semibold text-primary">
                <CalendarDays size={16} /> {formatFullDate(cart.visitDate, locale)}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {cart.items.map((i) => (
                  <li key={i.ticket_type_id} className="flex justify-between text-ink/70">
                    <span>
                      {i.name} × {num(i.quantity, locale)}
                    </span>
                    <span className="font-semibold text-forest">${(i.price * i.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1.5 border-t border-dashed border-black/10 pt-4 text-sm">
                <div className="flex justify-between text-ink/60">
                  <span>{t.checkout.subtotal}</span>
                  <span>{usd(q?.subtotal ?? cart.subtotal)}</span>
                </div>
                {q?.code?.ok && (
                  <div className="flex justify-between text-primary">
                    <span>
                      {P.codeLine} <span className="font-mono text-xs">({q.code.code})</span>
                    </span>
                    <span>-{usd(q.code.amount)}</span>
                  </div>
                )}
                {!!q?.pointsDiscount && (
                  <div className="flex justify-between text-primary">
                    <span>
                      {P.pointsLine} <span className="text-xs">({q.pointsUsed})</span>
                    </span>
                    <span>-{usd(q.pointsDiscount)}</span>
                  </div>
                )}
                <div className={cn("flex justify-between font-bold", q?.totalDiscount ? "text-primary" : "text-ink/40")}>
                  <span>{P.totalOff}</span>
                  <span>-{usd(q?.totalDiscount ?? 0)}</span>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-dashed border-black/10 pt-4">
                <span className="text-sm font-semibold text-ink/60">{P.toPay}</span>
                <span className="font-display text-3xl font-extrabold text-primary">{usd(q?.total ?? cart.subtotal)}</span>
              </div>
              {!!q?.totalDiscount && (
                <p className="mt-3 rounded-2xl bg-light-green px-3 py-2 text-center text-sm font-bold text-primary">{P.saved(usd(q.totalDiscount))}</p>
              )}
            </aside>
          </div>
        ) : null}
    </main>
  );
}
