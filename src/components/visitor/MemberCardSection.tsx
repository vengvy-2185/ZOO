import { IdCard as IdCardIcon, CheckCircle2, Clock, PackageCheck, Footprints, Wallet } from "lucide-react";
import { IdCard } from "@/components/IdCard";
import { CARD_STYLE, TIERS, memberNo } from "@/lib/members";
import type { MemberRow } from "@/lib/server/members";
import { cn } from "@/lib/utils/cn";

/** Account page: which ID card you have or can earn, and whether it is ready to collect. */
export function MemberCardSection({ m, km, site }: { m: MemberRow; km: boolean; site: string }) {
  const since = new Date(m.since).toISOString().slice(0, 7).replace("-", ".");
  const isTeam = m.role === "admin" || m.role === "staff";
  const next = TIERS.find((t) => !(m.visits >= t.visits || m.spent >= t.spent));
  const L = km
    ? {
        title: isTeam ? "កាតបុគ្គលិករបស់អ្នក" : "កាតសមាជិករបស់ខ្ញុំ",
        ready: (n: string) => `កាត${n}របស់អ្នករួចរាល់ហើយ! មកបញ្ជរលក់សំបុត្រ ហើយបង្ហាញទំព័រនេះ ដើម្បីទទួលកាតបោះពុម្ពរបស់អ្នក។`,
        printed: "កាតរបស់អ្នកបានបោះពុម្ពរួច ហើយកំពុងរង់ចាំអ្នកនៅបញ្ជរលក់សំបុត្រ។",
        collected: "អ្នកបានទទួលកាតរួចហើយ។ អរគុណដែលជាសមាជិករបស់យើង!",
        save: "រក្សាទុកក្នុងទូរស័ព្ទ",
        print: "បោះពុម្ព",
        issued: (n: number) => `បានប្រគល់កាត ${n} ដង។ បើបាត់កាត សូមប្រាប់បុគ្គលិក ដើម្បីធ្វើកាតជំនួស។`,
        team: "សូមស្នើអ្នកគ្រប់គ្រងឲ្យបោះពុម្ពកាតរបស់អ្នក។",
        how: "របៀបទទួលកាតសមាជិក",
        rule: (v: number, s: number) => `មកលេង ${v} ដង ឬចំណាយ $${s}`,
        you: "របស់អ្នក",
        visits: "ដងមកលេង",
        spent: "បានចំណាយ",
        next: (n: string, v: number, s: string) => `ខ្វះ ${v} ដងមកលេង ឬ ${s} ទៀត ដើម្បីទទួលបានកាត${n}។`,
        note: "រាប់តែសំបុត្រដែលបានស្កេននៅច្រកចូល និងការទិញដែលបានចូលគណនី។",
      }
    : {
        title: isTeam ? "Your staff card" : "My member card",
        ready: (n: string) => `Your ${n} card is ready! Come to the ticket counter and show this page to collect your printed card.`,
        printed: "Your card has been printed and is waiting for you at the ticket counter.",
        collected: "You have your card. Thank you for being a member!",
        save: "Save to phone",
        print: "Print",
        issued: (n: number) => `Card handed over ${n} ${n === 1 ? "time" : "times"}. Lost it? Tell a staff member and they will make a replacement.`,
        team: "Ask an admin to print your card.",
        how: "How to earn a member card",
        rule: (v: number, s: number) => `${v} visits or $${s} spent`,
        you: "You",
        visits: "visits",
        spent: "spent",
        next: (n: string, v: number, s: string) => `${v} more visits or ${s} more to get the ${n} card.`,
        note: "Counts tickets scanned at the gate and purchases made while signed in.",
      };
  const cardName = m.card ? (km ? CARD_STYLE[m.card].km : CARD_STYLE[m.card].en) : "";

  return (
    <section className="card overflow-hidden p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
        <IdCardIcon size={22} className="text-primary" /> {L.title}
      </h2>

      {m.card && (
        <div className="mt-4">
          <IdCard
            data={{ type: m.card, name: m.name, photo: m.avatar, memberNo: memberNo(m.id), since, site, verifyUrl: m.verifyToken ? `${site}/verify/${m.verifyToken}` : null }}
            fileName={`green-wild-zoo-card-${memberNo(m.id)}`}
            labels={{ save: L.save, print: L.print }}
            width={240}
          />
        </div>
      )}
      {m.card && m.issueCount > 0 && <p className="mt-3 text-center text-xs text-ink/55">{L.issued(m.issueCount)}</p>}

      {m.card && (
        <p className={cn("mt-3 flex items-start gap-2 rounded-2xl p-3 text-sm font-semibold", m.cardStatus === "collected" ? "bg-light-green text-primary" : "bg-accent/25 text-forest")}>
          {m.cardStatus === "collected" ? <PackageCheck size={18} className="mt-0.5 flex-shrink-0" /> : m.cardStatus === "printed" ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> : <Clock size={18} className="mt-0.5 flex-shrink-0" />}
          <span>{m.cardStatus === "collected" ? L.collected : m.cardStatus === "printed" ? L.printed : isTeam ? L.team : L.ready(cardName)}</span>
        </p>
      )}

      {!isTeam && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-cream p-3">
              <Footprints size={18} className="text-primary" />
              <p className="font-display text-2xl font-extrabold text-forest">{m.visits}</p>
              <p className="text-xs text-ink/55">{L.visits}</p>
            </div>
            <div className="rounded-2xl bg-cream p-3">
              <Wallet size={18} className="text-primary" />
              <p className="font-display text-2xl font-extrabold text-forest">${m.spent.toFixed(2)}</p>
              <p className="text-xs text-ink/55">{L.spent}</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-forest">{L.how}</p>
          <ul className="mt-2 space-y-2">
            {TIERS.map((t) => {
              const got = m.visits >= t.visits || m.spent >= t.spent;
              const s = CARD_STYLE[t.key];
              const pct = Math.min(100, Math.max((m.visits / t.visits) * 100, (m.spent / t.spent) * 100));
              return (
                <li key={t.key} className="rounded-2xl bg-cream p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 flex-shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-forest">{km ? s.km : s.en}</span>
                      <span className="block text-xs text-ink/55">{L.rule(t.visits, t.spent)}</span>
                    </span>
                    {got && <CheckCircle2 size={20} className="flex-shrink-0 text-primary" />}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.to }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {next && (
            <p className="mt-3 text-sm font-semibold text-primary">
              {L.next(km ? CARD_STYLE[next.key].km : CARD_STYLE[next.key].en, Math.max(0, next.visits - m.visits), `$${Math.max(0, next.spent - m.spent).toFixed(2)}`)}
            </p>
          )}
          <p className="mt-2 text-xs text-ink/45">{L.note}</p>
        </>
      )}
    </section>
  );
}
