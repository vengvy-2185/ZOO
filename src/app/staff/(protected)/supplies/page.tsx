import { Clock, CheckCircle2, Truck, XCircle, AlertTriangle, PackageOpen } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { SupplyForm } from "@/components/staff/SupplyForm";
import { getStaffSettings, supplyPicks } from "@/lib/server/staff-settings";
import { SUPPLY_SECTIONS, type Section } from "@/lib/staff-extras";
import { setSupplyStatus } from "../actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Supplies", "សុំសម្ភារៈ");

const STATUS = {
  pending: { Icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-200", en: "Waiting", km: "កំពុងរង់ចាំ" },
  approved: { Icon: CheckCircle2, cls: "bg-[#EEF2FF] text-[#1D4ED8] ring-[#C7D2FE]", en: "Approved", km: "បានយល់ព្រម" },
  delivered: { Icon: Truck, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", en: "Delivered", km: "បានប្រគល់" },
  rejected: { Icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-200", en: "Not approved", km: "មិនយល់ព្រម" },
} as const;

/** Every section asks for what it needs; managers approve and mark it delivered. */
export default async function SuppliesPage({ searchParams }: { searchParams: { v?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const view = manager && searchParams.v !== "mine" ? "all" : "mine";
  const { locale } = getI18n();
  const km = locale === "km";
  const sections: Section[] = (["tickets", "animals", "cleaning", "guide"] as const).filter((s) => access.perms.has(s));
  sections.push("general");
  const db = createServiceRoleClient();
  const settings = await getStaffSettings();
  let q = db.from("staff_supply_requests").select("*").order("created_at", { ascending: false }).limit(80);
  if (view === "mine") q = q.eq("user_id", userId);
  const { data } = await q;
  const rows = (data ?? []) as any[];
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const { data: people } = ids.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
  const nameOf = new Map((people ?? []).map((p: any) => [p.user_id, p.full_name]));
  const waiting = rows.filter((r) => r.status === "pending").length;
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "សុំសម្ភារៈ", sub: "ស្នើសុំរបស់ដែលផ្នែករបស់អ្នកត្រូវការ ហើយតាមដានរហូតដល់ទទួលបាន។", ask: "សំណើថ្មី", all: "សំណើទាំងអស់", mine: "សំណើរបស់ខ្ញុំ", none: "មិនទាន់មានសំណើទេ។", waiting: "កំពុងរង់ចាំ", approve: "យល់ព្រម", deliver: "បានប្រគល់", reject: "មិនយល់ព្រម", cancel: "បោះបង់", reopen: "ត្រឡប់ទៅរង់ចាំ" }
    : { title: "Supplies", sub: "Ask for what your section needs and follow it until it arrives.", ask: "New request", all: "All requests", mine: "My requests", none: "No requests yet.", waiting: "waiting", approve: "Approve", deliver: "Delivered", reject: "Refuse", cancel: "Cancel", reopen: "Back to waiting" };

  return (
    <StaffShell
      title={L.title}
      subtitle={L.sub}
      hero={waiting > 0 ? <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold ring-1 ring-white/20"><Clock size={15} /> {waiting} {L.waiting}</p> : undefined}
    >
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.ask}</h2>
          <SupplyForm km={km} sections={sections} picks={Object.fromEntries(sections.map((k) => [k, supplyPicks(settings.supplies[k])]))} />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            {manager ? (
              (["all", "mine"] as const).map((v) => (
                <a key={v} href={`/staff/supplies?v=${v}`} className={cn("rounded-full px-4 py-2 text-sm font-bold shadow-soft", view === v ? "bg-[#1D4ED8] text-white" : "bg-white text-[#1E3A8A]")}>
                  {v === "all" ? L.all : L.mine}
                </a>
              ))
            ) : (
              <h2 className="font-display text-xl font-extrabold text-forest">{L.mine}</h2>
            )}
          </div>
          <div className="space-y-2.5">
            {rows.length === 0 && (
              <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-ink/55">
                <PackageOpen size={36} className="text-[#93C5FD]" /> {L.none}
              </div>
            )}
            {rows.map((r, i) => {
              const S = STATUS[r.status as keyof typeof STATUS] ?? STATUS.pending;
              const X = SUPPLY_SECTIONS[r.section as Section] ?? SUPPLY_SECTIONS.general;
              return (
                <div key={r.id} className={cn("card animate-[gwzPop_.4s_ease-out_both] p-4", r.urgent && r.status === "pending" && "ring-2 ring-red-300")} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: X.color }}><X.Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-extrabold text-forest">{r.item}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-ink/70">× {r.quantity}</span>
                        {r.urgent && <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white"><AlertTriangle size={11} /> {km ? "បន្ទាន់" : "Urgent"}</span>}
                      </p>
                      <p className="text-xs text-ink/50">{km ? X.km : X.en}{view === "all" && ` · ${nameOf.get(r.user_id) ?? (km ? "អ្នកគ្រប់គ្រង" : "Admin")}`} · {when(r.created_at)}</p>
                      {r.note && <p className="mt-1 text-sm text-ink/65">{r.note}</p>}
                    </div>
                    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${S.cls}`}><S.Icon size={13} /> {km ? S.km : S.en}</span>
                  </div>
                  {/* progress line: waiting → approved → delivered */}
                  <div className="mt-3 flex items-center gap-1.5">
                    {(["pending", "approved", "delivered"] as const).map((st, k) => {
                      const reached = r.status !== "rejected" && ["pending", "approved", "delivered"].indexOf(r.status) >= k;
                      return <span key={st} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-700", reached ? (r.status === "delivered" ? "bg-emerald-500" : "bg-[#3B82F6]") : "bg-slate-100")} />;
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {manager && r.status === "pending" && (
                      <>
                        <form action={setSupplyStatus.bind(null, r.id, "rejected")}><button className="rounded-full px-3.5 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50">{L.reject}</button></form>
                        <form action={setSupplyStatus.bind(null, r.id, "approved")}><button className="rounded-full bg-[#1D4ED8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1E40AF]">{L.approve}</button></form>
                      </>
                    )}
                    {manager && r.status === "approved" && (
                      <form action={setSupplyStatus.bind(null, r.id, "delivered")}><button className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Truck size={13} /> {L.deliver}</button></form>
                    )}
                    {manager && (r.status === "rejected" || r.status === "delivered") && (
                      <form action={setSupplyStatus.bind(null, r.id, "pending")}><button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink/45 ring-1 ring-black/10 hover:text-ink">{L.reopen}</button></form>
                    )}
                    {!manager && r.status === "pending" && r.user_id === userId && (
                      <form action={setSupplyStatus.bind(null, r.id, "cancel")}><button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink/50 ring-1 ring-black/10 hover:text-red-600">{L.cancel}</button></form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
