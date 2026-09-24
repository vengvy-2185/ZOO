import Link from "next/link";
import { IdCard, Users, Footprints, Wallet, Printer, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { getMembers, type MemberRow } from "@/lib/server/members";
import { CARD_STYLE, TIERS } from "@/lib/members";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "cards", "visitor", "staff", "admin"] as const;

export default async function AdminMembersPage({ searchParams }: { searchParams: { f?: string; q?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const f = (FILTERS as readonly string[]).includes(searchParams.f ?? "") ? searchParams.f! : "all";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const all = await getMembers();

  const rows = all
    .filter((m) => (f === "all" ? true : f === "cards" ? !!m.card && m.cardStatus !== "collected" : m.role === f))
    .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q))
    .sort((a, b) => b.visits - a.visits || b.spent - a.spent);

  const totals = {
    people: all.length,
    visits: all.reduce((s, m) => s + m.visits, 0),
    spent: all.reduce((s, m) => s + m.spent, 0),
    waiting: all.filter((m) => m.card && !m.cardStatus).length,
  };
  const L = km
    ? { title: "សមាជិក និងកាតសម្គាល់", sub: "ចំនួនដងមកលេង និងប្រាក់ដែលចំណាយរបស់គណនីនីមួយៗ។ បោះពុម្ពកាតសម្រាប់ពាក់ក សម្រាប់សមាជិក បុគ្គលិក និងអ្នកគ្រប់គ្រង។", people: "គណនី", visits: "ដងមកលេងសរុប", spent: "ប្រាក់ចំណាយតាមគណនី", waiting: "កាតរង់ចាំបោះពុម្ព", f: { all: "ទាំងអស់", cards: "ត្រូវការកាត", visitor: "ភ្ញៀវ", staff: "បុគ្គលិក", admin: "អ្នកគ្រប់គ្រង" }, search: "ស្វែងរកឈ្មោះ ឬអ៊ីមែល", visitsCol: "មកលេង", spentCol: "ចំណាយ", card: "កាត", print: "បោះពុម្ពកាត", noCard: "មិនទាន់", printed: "បានបោះពុម្ព", collected: "បានប្រគល់", rules: "លក្ខខណ្ឌទទួលកាតសមាជិក", or: "ឬ", times: "ដង" }
    : { title: "Members and ID cards", sub: "How often each account has visited and how much they have spent. Print lanyard cards for members, staff and admins.", people: "Accounts", visits: "Total visits", spent: "Spent by accounts", waiting: "Cards to print", f: { all: "All", cards: "Needs a card", visitor: "Visitors", staff: "Staff", admin: "Admins" }, search: "Search name or email", visitsCol: "Visits", spentCol: "Spent", card: "Card", print: "Print card", noCard: "Not yet", printed: "Printed", collected: "Handed over", rules: "How visitors earn a member card", or: "or", times: "visits" };

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader icon={IdCard} title={L.title} subtitle={L.sub} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [Users, L.people, String(totals.people)],
          [Footprints, L.visits, String(totals.visits)],
          [Wallet, L.spent, `$${totals.spent.toFixed(2)}`],
          [Printer, L.waiting, String(totals.waiting)],
        ].map(([Icon, label, value]: any) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-green text-primary">
              <Icon size={22} />
            </span>
            <span>
              <span className="block font-display text-2xl font-extrabold text-forest">{value}</span>
              <span className="text-xs text-ink/55">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="card mb-5 p-4">
        <p className="mb-2 text-sm font-bold text-forest">{L.rules}</p>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <span key={t.key} className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${CARD_STYLE[t.key].from}, ${CARD_STYLE[t.key].to})` }}>
              {km ? CARD_STYLE[t.key].km : CARD_STYLE[t.key].en}: {t.visits} {L.times} {L.or} ${t.spent}
            </span>
          ))}
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-soft">
          {FILTERS.map((k) => (
            <Link key={k} href={`/admin/members?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", f === k ? "bg-primary text-white" : "text-forest")}>
              {L.f[k]}
            </Link>
          ))}
        </div>
        <input type="hidden" name="f" value={f} />
        <div className="relative min-w-[14rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input name="q" defaultValue={searchParams.q ?? ""} placeholder={L.search} className="input pl-10" />
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-ink/50">
            <tr>
              <th className="px-4 py-3">{L.people}</th>
              <th className="px-4 py-3 text-right">{L.visitsCol}</th>
              <th className="px-4 py-3 text-right">{L.spentCol}</th>
              <th className="px-4 py-3">{L.card}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((m) => (
              <Row key={m.id} m={m} km={km} L={L} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ m, km, L }: { m: MemberRow; km: boolean; L: any }) {
  const s = m.card ? CARD_STYLE[m.card] : null;
  return (
    <tr className="hover:bg-cream/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-light-green font-bold text-primary">
            {m.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              [...m.name][0]?.toUpperCase()
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-forest">{m.name}</span>
            <span className="block truncate text-xs text-ink/50">{m.email}</span>
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-display text-lg font-bold text-forest">{m.visits}</td>
      <td className="px-4 py-3 text-right font-semibold text-forest">${m.spent.toFixed(2)}</td>
      <td className="px-4 py-3">
        {s ? (
          <span className="inline-flex flex-col">
            <span className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
              {km ? s.km : s.en}
            </span>
            <span className="mt-1 text-[11px] text-ink/50">{m.cardStatus === "collected" ? L.collected : m.cardStatus === "printed" ? L.printed : ""}</span>
          </span>
        ) : (
          <span className="text-xs text-ink/40">{L.noCard}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {m.card && (
          <Link href={`/admin/card/${m.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white">
            <Printer size={14} /> {L.print}
          </Link>
        )}
      </td>
    </tr>
  );
}
