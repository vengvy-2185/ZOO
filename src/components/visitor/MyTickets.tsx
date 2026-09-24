"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, QrCode, Wallet, CheckCircle2, Users, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { readSavedTickets, rememberTicket, MY_TICKETS_EVENT } from "@/lib/my-tickets";
import { zooToday } from "@/lib/data/gate";

/** Invisible: remembers the ticket being viewed on this device. */
export function RememberTicket({ code, k }: { code: string; k: string }) {
  useEffect(() => rememberTicket(code, k), [code, k]);
  return null;
}

/** Header button with a count badge. */
export function MyTicketsButton({ label, signedInCount = 0 }: { label: string; signedInCount?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(readSavedTickets().length);
    update();
    window.addEventListener(MY_TICKETS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(MY_TICKETS_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const count = Math.max(n, signedInCount);
  return (
    <Link href="/my-tickets" title={label} aria-label={label} className="relative flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-forest transition hover:bg-light-green">
      <Ticket size={19} strokeWidth={2.4} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{count}</span>
      )}
    </Link>
  );
}

export type TicketSummary = { code: string; k: string; visitDate: string; status: string; total: number; visitors: number; usedAt: string | null };

/** The /my-tickets list: signed-in bookings (from the server) + tickets remembered on this device. */
export function MyTicketsList({ fromAccount }: { fromAccount: TicketSummary[] }) {
  const { locale, t } = useI18n();
  const A = t.account;
  const km = locale === "km";
  const [local, setLocal] = useState<TicketSummary[] | null>(null);

  useEffect(() => {
    const saved = readSavedTickets().filter((s) => !fromAccount.some((f) => f.code === s.code));
    if (!saved.length) return setLocal([]);
    fetch("/api/tickets/mine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: saved.map(({ code, k }) => ({ code, k })) }) })
      .then((r) => r.json())
      .then((d) => setLocal(d.tickets ?? []))
      .catch(() => setLocal([]));
  }, [fromAccount]);

  if (local === null) {
    return (
      <div className="flex justify-center p-10 text-primary">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const all = [...fromAccount, ...local];
  const today = zooToday();
  const kind = (b: TicketSummary) => (b.status === "pending" ? "unpaid" : b.status === "confirmed" && !b.usedAt && b.visitDate >= today ? "upcoming" : "past");
  const groups = (["unpaid", "upcoming", "past"] as const).map((g) => ({ g, list: all.filter((b) => kind(b) === g) }));
  const month = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "short" }).format(new Date(d + "T12:00:00"));

  if (!all.length) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <Ticket size={44} className="text-primary" />
        <p className="text-sm text-ink/60">{A.noTickets}</p>
        <Link href="/tickets" className="btn-primary">
          <Ticket size={16} /> {A.getTickets}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {groups.map(({ g, list }) =>
        list.length ? (
          <section key={g}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/45">
              {g === "unpaid" ? A.unpaid : g === "upcoming" ? A.upcoming : A.pastTickets} ({list.length})
            </p>
            <div className="space-y-2.5">
              {list.map((b) => (
                <Link
                  key={b.code}
                  href={g === "unpaid" ? `/pay/${b.code}?k=${b.k}` : `/ticket/${b.code}?k=${b.k}`}
                  className={`card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${g === "past" ? "opacity-70" : ""}`}
                >
                  <span
                    className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl ${
                      g === "unpaid" ? "bg-red-50 text-[#E1232E]" : g === "upcoming" ? "bg-primary text-white" : "bg-black/5 text-ink/50"
                    }`}
                  >
                    <span className="font-display text-xl font-extrabold leading-none">{b.visitDate.slice(8, 10)}</span>
                    <span className="text-[10px] font-bold uppercase">{month(b.visitDate)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-base font-bold text-forest">{b.code}</div>
                    <div className="flex items-center gap-3 text-xs text-ink/55">
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} /> {A.visitorsN(b.visitors)}
                      </span>
                      <span>${b.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {g === "unpaid" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E1232E] px-3 py-1.5 text-xs font-extrabold text-white">
                      <Wallet size={13} /> {A.payNow}
                    </span>
                  ) : g === "upcoming" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary">
                      <QrCode size={13} /> {A.showQr}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold text-ink/55">
                      {b.usedAt ? (
                        <>
                          <CheckCircle2 size={13} /> {A.used}
                        </>
                      ) : (
                        t.ticket.status[b.status] ?? b.status
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
