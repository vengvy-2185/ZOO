"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Baby, GraduationCap, Users, HeartHandshake, Minus, Plus, CalendarDays, Check, ArrowRight, Zap, X, User, type LucideIcon } from "lucide-react";
import type { TicketType } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { num } from "@/lib/utils/age";
import { zooToday } from "@/lib/data/gate";

// Pick a friendly icon from the ticket name (admins name ticket types freely).
function ticketIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("child") || n.includes("kid")) return Baby;
  if (n.includes("student")) return GraduationCap;
  if (n.includes("family") || n.includes("group")) return Users;
  if (n.includes("senior") || n.includes("elder")) return HeartHandshake;
  return Ticket;
}

export function TicketSelector({ ticketTypes, initialDate }: { ticketTypes: TicketType[]; /** e.g. from "When are you visiting?" on the homepage */ initialDate?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const today = zooToday();
  const [visitDate, setVisitDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= today ? initialDate : today);
  const [qty, setQty] = useState<Record<string, number>>({});

  const subtotal = useMemo(
    () => ticketTypes.reduce((sum, tt) => sum + (qty[tt.id] ?? 0) * tt.price_usd, 0),
    [qty, ticketTypes]
  );
  const totalVisitors = Object.values(qty).reduce((a, b) => a + b, 0);

  function setQuantity(id: string, value: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(50, value)) }));
  }

  // Quick picks for the most common groups (matched by ticket name, so they
  // only appear when the zoo sells adult and child tickets).
  const adult = ticketTypes.find((tt) => /adult/i.test(tt.name));
  const child = ticketTypes.find((tt) => /child|kid/i.test(tt.name) && !/under/i.test(tt.name));
  const presets =
    adult && child
      ? [
          { label: t.tickets.presetCouple, icons: [User, User], q: { [adult.id]: 2 } },
          { label: t.tickets.presetParent, icons: [User, Baby], q: { [adult.id]: 1, [child.id]: 1 } },
          { label: t.tickets.presetFamily, icons: [Users, Baby], q: { [adult.id]: 2, [child.id]: 2 } },
        ]
      : [];

  function continueToCheckout() {
    const items = ticketTypes
      .filter((tt) => (qty[tt.id] ?? 0) > 0)
      .map((tt) => ({ ticket_type_id: tt.id, name: (locale === "km" && tt.khmer_name) || tt.name, price: tt.price_usd, quantity: qty[tt.id] }));
    if (items.length === 0) return;
    sessionStorage.setItem("gwz_cart", JSON.stringify({ visitDate, items, subtotal }));
    router.push("/checkout");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        {presets.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-forest">
                <Zap size={15} className="text-accent" /> {t.tickets.quickPick}
              </span>
              {totalVisitors > 0 && (
                <button onClick={() => setQty({})} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                  <X size={13} /> {t.tickets.clearAll}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {presets.map((p) => {
                const active = Object.keys(p.q).length === Object.keys(qty).filter((k) => (qty[k] ?? 0) > 0).length && Object.entries(p.q).every(([k, v]) => qty[k] === v);
                return (
                  <button
                    key={p.label}
                    onClick={() => setQty(p.q)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-3 text-center shadow-soft ring-2 transition hover:-translate-y-0.5 active:scale-[.98]",
                      active ? "ring-primary" : "ring-transparent hover:ring-primary/40"
                    )}
                  >
                    <span className={cn("flex h-10 items-center justify-center gap-0.5 rounded-xl px-2.5", active ? "bg-primary text-white" : "bg-light-green text-primary")}>
                      {p.icons.map((I, i) => (
                        <I key={i} size={i === 0 ? 20 : 16} strokeWidth={2.3} />
                      ))}
                    </span>
                    <span className="text-xs font-bold leading-snug text-forest sm:text-sm">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2" data-reveal-stagger="zoom">
          {ticketTypes.map((tt) => {
            const Icon = ticketIcon(tt.name);
            const count = qty[tt.id] ?? 0;
            return (
              <div
                key={tt.id}
                className={cn(
                  "flex flex-col rounded-3xl bg-white p-5 shadow-soft ring-2 transition",
                  count > 0 ? "ring-primary" : "ring-transparent"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-primary">
                    <Icon size={24} />
                  </span>
                  {count > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
                      <Check size={12} strokeWidth={3} /> {t.tickets.selected(count)}
                    </span>
                  )}
                </div>
                <div className="mt-3 font-display text-lg font-bold leading-tight text-forest">{(locale === "km" && tt.khmer_name) || tt.name}</div>
                {locale !== "km" && tt.khmer_name && <div className="font-khmer text-xs text-ink/50">{tt.khmer_name}</div>}
                <div className="mt-2 font-display text-3xl font-extrabold text-primary">
                  {tt.price_usd === 0 ? t.common.free : `$${num(tt.price_usd.toFixed(2).replace(/\.00$/, ""), locale)}`}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-ink/55">
                  {[t.tickets.featureAccess, t.tickets.featureMap].map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Check size={12} className="text-primary" strokeWidth={3} /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between rounded-full bg-cream p-1">
                  <button
                    onClick={() => setQuantity(tt.id, count - 1)}
                    disabled={count === 0}
                    aria-label={t.tickets.remove(tt.name)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-forest shadow-sm transition hover:bg-light-green disabled:opacity-40"
                  >
                    <Minus size={16} strokeWidth={2.6} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50}
                    value={count}
                    aria-label={t.tickets.howMany}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuantity(tt.id, Number(e.target.value) || 0)}
                    className="w-16 bg-transparent text-center font-display text-lg font-bold text-forest outline-none [appearance:textfield] focus:rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/30 [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity(tt.id, count + 1)}
                    aria-label={t.tickets.add(tt.name)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-forest"
                  >
                    <Plus size={16} strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {ticketTypes.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-primary/15 bg-white/60 p-10 text-center text-sm text-ink/55">
            {t.tickets.none}
          </div>
        )}
      </div>

      {/* Order summary — sticks beside the list on desktop */}
      <aside className="card h-fit p-5 lg:sticky lg:top-24">
        <h3 className="font-display text-xl font-bold text-forest">{t.tickets.yourOrder}</h3>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-ink/45">
          {t.tickets.visitDate}
          <div className="relative mt-1.5">
            <CalendarDays size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input
              type="date"
              value={visitDate}
              min={today}
              onChange={(e) => setVisitDate(e.target.value)}
              className="input pl-11 font-semibold normal-case tracking-normal text-forest"
            />
          </div>
        </label>

        <ul className="mt-4 space-y-2 border-t border-dashed border-black/10 pt-4 text-sm">
          {ticketTypes
            .filter((tt) => (qty[tt.id] ?? 0) > 0)
            .map((tt) => (
              <li key={tt.id} className="flex items-center justify-between gap-2 text-ink/70">
                <span className="min-w-0 flex-1 truncate">{(locale === "km" && tt.khmer_name) || tt.name}</span>
                <span className="flex items-center gap-1">
                  <button onClick={() => setQuantity(tt.id, qty[tt.id] - 1)} aria-label={t.tickets.remove(tt.name)} className="flex h-6 w-6 items-center justify-center rounded-full bg-cream text-forest hover:bg-light-green">
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="w-6 text-center font-bold text-forest">{num(qty[tt.id], locale)}</span>
                  <button onClick={() => setQuantity(tt.id, qty[tt.id] + 1)} aria-label={t.tickets.add(tt.name)} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-forest">
                    <Plus size={12} strokeWidth={3} />
                  </button>
                </span>
                <span className="w-16 text-right font-semibold text-forest">${(tt.price_usd * qty[tt.id]).toFixed(2)}</span>
              </li>
            ))}
          {totalVisitors === 0 && <li className="text-ink/45">{t.tickets.addToStart}</li>}
        </ul>

        <div className="mt-4 flex items-end justify-between border-t border-black/5 pt-4">
          <span className="text-sm text-ink/55">
            {t.tickets.totalVisitors(totalVisitors)}
          </span>
          <span className="font-display text-3xl font-extrabold text-primary">${subtotal.toFixed(2)}</span>
        </div>

        <button onClick={continueToCheckout} disabled={totalVisitors === 0} className="btn-primary mt-5 w-full py-3.5 text-base hover:translate-y-0">
          {t.tickets.continue} <ArrowRight size={18} />
        </button>
      </aside>
    </div>
  );
}
