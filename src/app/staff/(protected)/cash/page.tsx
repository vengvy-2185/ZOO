import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, Flag, Clock, Users, Pencil } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { GATE_CATEGORIES, zooToday } from "@/lib/data/gate";
import { expectedCash, usd } from "@/lib/server/cash";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { StaffShell } from "@/components/staff/StaffShell";
import { CashCloseForm } from "@/components/staff/CashCloseForm";
import { ActionButton } from "@/components/staff/ActionButton";
import { reviewCashClose } from "./actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Cash close", "បិទបញ្ជីប្រាក់");

type Close = {
  id: string; day: string; user_id: string; visitors: number; expected_usd: number; total_usd: number; counted_usd: number; counted_khr: number;
  diff_usd: number; note: string | null; status: "submitted" | "approved" | "flagged"; edits: number; first_total_usd: number | null; updated_at: string;
};

const STATUS = {
  submitted: { km: "រង់ចាំពិនិត្យ", en: "Waiting", cls: "bg-amber-50 text-amber-700 ring-amber-200", Icon: Clock },
  approved: { km: "បានអនុម័ត", en: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  flagged: { km: "ត្រូវពិនិត្យបន្ថែម", en: "Look into it", cls: "bg-red-50 text-red-700 ring-red-200", Icon: Flag },
} as const;

/** End of the day: gate staff hand in the cash; managers check every close. */
export default async function CashPage() {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const gate = access.perms.has("tickets");
  const manager = access.admin || access.perms.has("reports");
  if (!gate && !manager) redirect("/staff");
  const { locale } = getI18n();
  const km = locale === "km";
  const today = zooToday();
  const db = createServiceRoleClient();
  const since = zooToday(-30);
  const tol = (await getStaffSettings()).cash_tolerance;

  const [mine, e, { data: all }, { data: todayGate }] = await Promise.all([
    gate ? db.from("staff_cash_closes").select("*").eq("user_id", userId).gte("day", since).order("day", { ascending: false }).limit(14) : Promise.resolve({ data: [] as any[] }),
    gate ? expectedCash(userId, today) : Promise.resolve(null),
    manager ? db.from("staff_cash_closes").select("*").gte("day", since).order("day", { ascending: false }).order("updated_at", { ascending: false }).limit(80) : Promise.resolve({ data: [] as any[] }),
    manager ? db.from("gate_entries").select("created_by").eq("entry_date", today).eq("source", "gate") : Promise.resolve({ data: [] as any[] }),
  ]);
  const myCloses = (mine.data ?? []) as Close[];
  const todayMine = myCloses.find((c) => c.day === today);
  const closes = (all ?? []) as Close[];

  // names for the manager's list
  const ids = [...new Set([...closes.map((c) => c.user_id), ...((todayGate ?? []) as any[]).map((g) => g.created_by).filter(Boolean)])];
  const { data: people } = ids.length ? await db.from("staff_members").select("user_id, full_name, full_name_km, staff_no").in("user_id", ids) : { data: [] as any[] };
  const nameOf = (id: string) => {
    const p = (people ?? []).find((x: any) => x.user_id === id);
    return p ? `${(km && p.full_name_km) || p.full_name} · ${p.staff_no}` : "Admin";
  };
  const closedToday = new Set(closes.filter((c) => c.day === today).map((c) => c.user_id));
  const notClosed = [...new Set(((todayGate ?? []) as any[]).map((g) => g.created_by as string).filter(Boolean))].filter((id) => !closedToday.has(id));
  const waiting = closes.filter((c) => c.status !== "approved");
  const done = closes.filter((c) => c.status === "approved").slice(0, 20);

  const dateStr = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${d}T00:00:00Z`));
  const Diff = ({ d }: { d: number; tol?: number }) => (
    <span className={cn("font-mono font-extrabold", Math.abs(d) <= tol ? "text-emerald-600" : d < 0 ? "text-red-600" : "text-amber-600")}>
      {Math.abs(d) <= tol ? "✓" : `${d < 0 ? "−" : "+"}${usd(Math.abs(d))}`}
    </span>
  );
  const Badge = ({ s }: { s: Close["status"] }) => {
    const x = STATUS[s];
    return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", x.cls)}><x.Icon size={13} /> {km ? x.km : x.en}</span>;
  };

  return (
    <StaffShell
      active="cash"
      title={km ? "បិទបញ្ជីប្រាក់" : "Cash close"}
      subtitle={km ? "ចុងថ្ងៃ៖ រាប់លុយដែលលក់សំបុត្រនៅច្រកចូល ហើយបញ្ជូនទៅអ្នកគ្រប់គ្រង។" : "End of the day: count the gate cash and send it to the managers."}
    >
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* admins see "my day" only when they counted at the gate themselves */}
        {gate && e && (access.staff || e.visitors > 0 || myCloses.length > 0) && (
          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]"><Banknote size={20} /></span>
              {km ? "ថ្ងៃនេះរបស់ខ្ញុំ" : "My day"} <span className="text-sm font-semibold text-ink/45">· {dateStr(today)}</span>
            </h2>
            <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-black/5">
                  {e.lines.map((l) => {
                    const c = GATE_CATEGORIES.find((g) => g.key === l.category)!;
                    return (
                      <tr key={l.category} className={l.count ? "" : "text-ink/35"}>
                        <td className="px-3 py-2 font-semibold">{c.emoji} {km ? c.km : c.en}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{l.count} × {usd(l.price)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">{usd(l.count * l.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#EEF2FF] text-[#1E3A8A]">
                    <td className="px-3 py-2.5 font-extrabold"><Users size={14} className="mr-1 inline" /> {e.visitors} {km ? "នាក់" : "visitors"}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold">{km ? "ត្រូវមាន" : "Should be"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-lg font-extrabold tabular-nums">{usd(e.expected)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs font-semibold text-ink/50">{km ? "ចំនួនខាងលើ មកពីការចុច + នៅទំព័ររាប់ភ្ញៀវរបស់អ្នកថ្ងៃនេះ (រួមទាំងការរាប់ពេលគ្មាន internet ដែលបាន sync រួច)។" : "From your taps on the gate counter today (including counts made offline that have synced)."}</p>

            {todayMine?.status === "approved" ? (
              <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} /> {km ? `បានអនុម័ត · រាប់បាន ${usd(todayMine.total_usd)}` : `Approved · counted ${usd(todayMine.total_usd)}`}</p>
            ) : (
              <>
                {todayMine && (
                  <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-ink/70">
                    {km ? "បានបញ្ជូនរួច" : "Sent"}: <b className="font-mono">{usd(todayMine.total_usd)}</b> <Diff d={todayMine.diff_usd} tol={e.tolerance} /> <Badge s={todayMine.status} />
                    <span className="w-full text-xs text-ink/45">{km ? "រាប់ខុស? អាចបញ្ជូនម្តងទៀតបាន (អ្នកគ្រប់គ្រងឃើញចំនួនដំបូងផង)។" : "Counted wrong? You can send again (managers also see the first count)."}</span>
                  </p>
                )}
                <CashCloseForm km={km} expected={e.expected} rate={e.rate} tolerance={e.tolerance} again={Boolean(todayMine)} />
              </>
            )}

            {myCloses.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">{km ? "ថ្ងៃមុនៗ" : "Earlier days"}</p>
                <ul className="divide-y divide-black/5 rounded-2xl ring-1 ring-black/5">
                  {myCloses.filter((c) => c.day !== today).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <span className="w-24 font-semibold text-ink/70">{dateStr(c.day)}</span>
                      <span className="flex-1 font-mono">{usd(c.total_usd)}</span>
                      <Diff d={c.diff_usd} tol={e.tolerance} />
                      <Badge s={c.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {manager && (
          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="font-display text-lg font-extrabold text-forest">{km ? "ពិនិត្យការបិទបញ្ជី" : "Check the closes"}</h2>
            {notClosed.length > 0 && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
                <p className="font-bold text-amber-800">{km ? "រាប់ភ្ញៀវថ្ងៃនេះ ប៉ុន្តែមិនទាន់បិទបញ្ជី៖" : "Counted visitors today but not closed yet:"}</p>
                <p className="mt-1 font-semibold text-amber-900">{notClosed.map(nameOf).join(" · ")}</p>
              </div>
            )}
            {waiting.length === 0 ? (
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{km ? "គ្មានអ្វីរង់ចាំទេ ✓" : "Nothing waiting ✓"}</p>
            ) : (
              <ul className="space-y-3">
                {waiting.map((c) => (
                  <li key={c.id} className={cn("rounded-2xl p-3 ring-1", c.status === "flagged" ? "bg-red-50/60 ring-red-200" : "bg-white ring-black/10")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 text-sm font-extrabold text-forest">{nameOf(c.user_id)}</p>
                      <span className="text-xs font-semibold text-ink/50">{dateStr(c.day)}</span>
                      <Badge s={c.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 py-2"><p className="text-ink/50">{km ? "ត្រូវមាន" : "Should be"}</p><p className="font-mono text-base font-extrabold">{usd(c.expected_usd)}</p></div>
                      <div className="rounded-xl bg-slate-50 py-2"><p className="text-ink/50">{km ? "រាប់បាន" : "Counted"}</p><p className="font-mono text-base font-extrabold">{usd(c.total_usd)}</p></div>
                      <div className="rounded-xl bg-slate-50 py-2"><p className="text-ink/50">{km ? "ខុសគ្នា" : "Difference"}</p><p className="text-base"><Diff d={c.diff_usd} /></p></div>
                    </div>
                    <p className="mt-2 text-xs text-ink/55">
                      {c.visitors} {km ? "នាក់" : "visitors"} · ${Number(c.counted_usd).toFixed(2)}{Number(c.counted_khr) ? ` + ${Number(c.counted_khr).toLocaleString("en-US")}៛` : ""}
                      {c.edits > 0 && <span className="ml-1 font-bold text-amber-700"><Pencil size={11} className="mr-0.5 inline" /> {km ? `កែ ${c.edits} ដង · រាប់ដំបូង ${usd(Number(c.first_total_usd))}` : `edited ${c.edits}× · first count ${usd(Number(c.first_total_usd))}`}</span>}
                    </p>
                    {c.note && <p className="mt-1.5 rounded-xl bg-white px-3 py-2 text-sm text-ink/75 ring-1 ring-black/5">💬 {c.note}</p>}
                    <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                      {c.status !== "flagged" && <ActionButton action={reviewCashClose.bind(null, c.id, "flagged")} label={km ? "ត្រូវពិនិត្យបន្ថែម" : "Look into it"} className="bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50" />}
                      <ActionButton action={reviewCashClose.bind(null, c.id, "approved")} label={km ? "អនុម័ត" : "Approve"} doneLabel={km ? "បានអនុម័ត" : "Approved"} className="bg-emerald-600 text-white hover:bg-emerald-700" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {done.length > 0 && (
              <details className="rounded-2xl ring-1 ring-black/5">
                <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-ink/60">{km ? `បានអនុម័តរួច (${done.length})` : `Approved (${done.length})`}</summary>
                <ul className="divide-y divide-black/5">
                  {done.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-24 text-ink/60">{dateStr(c.day)}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{nameOf(c.user_id)}</span>
                      <span className="font-mono">{usd(c.total_usd)}</span>
                      <Diff d={c.diff_usd} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </StaffShell>
  );
}
