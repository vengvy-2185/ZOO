import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, ScanLine, ShieldCheck } from "lucide-react";
import type { ScanOutcome } from "@/lib/server/checkin";

const TEXT = {
  en: {
    ok: "Allowed in. Welcome!",
    already: "Already used",
    unpaid: "Not paid yet",
    cancelled: "Booking cancelled",
    wrong_date: "Ticket is for another day",
    invalid: "Not a valid ticket",
    people: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
    usedAt: "Checked in at",
    allow: "Allow in anyway",
    scanner: "Open the scanner",
    staffOnly: "Staff check",
    visitorTitle: "Your ticket is ready",
    visitorText: "Only zoo staff can check you in. Show this QR at the entrance and they will scan it.",
  },
  km: {
    ok: "អនុញ្ញាតឲ្យចូល។ សូមស្វាគមន៍!",
    already: "សំបុត្របានប្រើរួចហើយ",
    unpaid: "មិនទាន់បង់ប្រាក់",
    cancelled: "ការកក់ត្រូវបានលុបចោល",
    wrong_date: "សំបុត្រសម្រាប់ថ្ងៃផ្សេង",
    invalid: "មិនមែនជាសំបុត្រត្រឹមត្រូវ",
    people: (n: number) => `${n} នាក់`,
    usedAt: "បានចូលនៅម៉ោង",
    allow: "អនុញ្ញាតឲ្យចូល",
    scanner: "បើកកម្មវិធីស្កេន",
    staffOnly: "ការពិនិត្យរបស់បុគ្គលិក",
    visitorTitle: "សំបុត្ររបស់អ្នករួចរាល់",
    visitorText: "មានតែបុគ្គលិកសួនសត្វទេដែលអាចឆែកចូលឲ្យអ្នកបាន។ សូមបង្ហាញ QR នេះនៅច្រកចូល ហើយបុគ្គលិកនឹងស្កេនវា។",
  },
};

const STYLE = {
  ok: { bg: "bg-emerald-600", Icon: CheckCircle2 },
  already: { bg: "bg-amber-500", Icon: AlertTriangle },
  wrong_date: { bg: "bg-amber-500", Icon: AlertTriangle },
  unpaid: { bg: "bg-red-600", Icon: XCircle },
  cancelled: { bg: "bg-red-600", Icon: XCircle },
  invalid: { bg: "bg-red-600", Icon: XCircle },
} as const;

/** Big coloured answer shown to staff/admin who scanned a ticket with their phone camera. */
export function GateVerdict({ out, km, time, forceHref, payHref }: { out: ScanOutcome; km: boolean; time: (iso: string) => string; forceHref: string; payHref?: string }) {
  const L = TEXT[km ? "km" : "en"];
  const S = STYLE[out.verdict];
  return (
    <div className={`mb-5 overflow-hidden rounded-[2rem] ${S.bg} text-white shadow-lift`}>
      <div className="flex items-center gap-2 bg-black/15 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white/85">
        <ShieldCheck size={14} /> {L.staffOnly}
      </div>
      <div className="p-5 text-center">
        <S.Icon size={64} className="mx-auto" strokeWidth={2.2} />
        <p className="mt-2 font-display text-3xl font-extrabold leading-tight">{L[out.verdict]}</p>
        {out.ticket && <p className="mt-1 text-lg font-bold text-white/90">{L.people(out.ticket.visitors)}</p>}
        {out.verdict === "already" && out.checkedInAt && (
          <p className="mt-1 text-sm text-white/85">
            {L.usedAt} {time(out.checkedInAt)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {out.verdict === "unpaid" && payHref && (
            <Link href={payHref} className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-red-700">
              {km ? "បង្ហាញ KHQR ឲ្យបង់នៅទីនេះ" : "Show KHQR to pay here"}
            </Link>
          )}
          {out.verdict === "wrong_date" && (
            <Link href={forceHref} className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-amber-700">
              {L.allow}
            </Link>
          )}
          <Link href="/staff/scanner" className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-5 py-2.5 text-sm font-bold ring-1 ring-white/40 hover:bg-white/30">
            <ScanLine size={16} /> {L.scanner}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Shown when a visitor opens their own ticket QR with the phone camera. */
export function VisitorScanNote({ km }: { km: boolean }) {
  const L = TEXT[km ? "km" : "en"];
  return (
    <div className="mb-5 flex items-start gap-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-primary/15">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary">
        <ShieldCheck size={22} />
      </span>
      <div>
        <p className="font-display font-bold text-forest">{L.visitorTitle}</p>
        <p className="text-sm text-ink/65">{L.visitorText}</p>
      </div>
    </div>
  );
}
