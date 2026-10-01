import Link from "next/link";
import { Search, Send, MessageCircle, Briefcase, Users, ShieldAlert, ExternalLink, Wallet, RefreshCcw } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { canHr, HR_STATUS, hrSettings, pickedByJob, site, type HrStatus } from "@/lib/server/hr";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { JobEditor, CopyLink } from "@/components/hr/HrBits";
import { HrStatusChip, HrStatusIcon } from "@/components/hr/HrStatusIcon";
import { cn } from "@/lib/utils/cn";
import { getStaff, PAY_TYPE } from "@/lib/server/staff";
import { salarySteps } from "@/lib/server/salary";
import { SalaryPanel } from "@/components/staff/SalaryPanel";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("HR · new staff", "HR · បុគ្គលិកថ្មី");

/** HR: applications for jobs (with CVs), and the open jobs. */
export default async function HrPage({ searchParams }: { searchParams: { tab?: string; s?: string; q?: string; job?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const { locale } = getI18n();
  const km = locale === "km";
  if (!canHr(access))
    return (
      <StaffShell title="HR">
        <p className="card flex items-center gap-3 p-5 text-sm font-semibold text-ink/70"><ShieldAlert size={20} className="text-amber-500" /> {km ? "ត្រូវការសិទ្ធិ HR។ សូមសុំ Admin។" : "Needs the HR permission. Ask an admin."}</p>
      </StaffShell>
    );
  const db = createServiceRoleClient();
  const tab = searchParams.tab === "jobs" ? "jobs" : searchParams.tab === "salary" ? "salary" : "apps";
  const [s, { data: jobs }, { data: counts }] = await Promise.all([hrSettings(), db.from("hr_jobs").select("*").order("sort").order("created_at", { ascending: false }), db.from("hr_applicants").select("status")]);
  let q = db.from("hr_applicants").select("id, code, full_name, full_name_km, phone, status, created_at, tg_chat_id, rating, job:hr_jobs(title, title_km), hr_messages(id, from_hr, read_at)").order("created_at", { ascending: false }).limit(200);
  if (searchParams.s && searchParams.s in HR_STATUS) q = q.eq("status", searchParams.s);
  // past applicants HR can ask back for a new opening
  if (searchParams.s === "past") q = q.in("status", ["rejected", "withdrawn"]);
  if (searchParams.job) q = q.eq("job_id", searchParams.job);
  if (searchParams.q) q = q.or(`full_name.ilike.%${searchParams.q.replace(/[%,()]/g, "")}%,phone.ilike.%${searchParams.q.replace(/[%,()]/g, "")}%,code.ilike.%${searchParams.q.replace(/[%,()]/g, "")}%`);
  const { data: apps } = tab === "apps" ? await q : { data: [] as any[] };
  const n = (st: string) => (counts ?? []).filter((c: any) => c.status === st).length;
  const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const link = (p: Record<string, string | undefined>) => "/staff/hr?" + new URLSearchParams(Object.entries({ ...searchParams, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <StaffShell
      title={km ? "HR · បុគ្គលិកថ្មី" : "HR · new staff"}
      subtitle={km ? "ពាក្យសុំការងារ CV ការសម្ភាសន៍ និងលទ្ធផល — បេក្ខជនទទួលដំណឹងតាម Telegram។" : "Applications, CVs, interviews and results — applicants are told on Telegram."}
      hero={
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyLink url={`${site()}/careers`} km={km} />
          <a href="/careers" target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20"><ExternalLink size={13} /> {km ? "ទំព័រដាក់ពាក្យ" : "Careers page"}</a>
          <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", s.accept ? "bg-emerald-400/30" : "bg-red-500/40")}>{s.accept ? (km ? "✓ កំពុងទទួលពាក្យ" : "✓ Taking applications") : km ? "បិទទទួលពាក្យ" : "Applications closed"}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold", s.telegram_on && s.bot_username ? "bg-sky-400/30" : "bg-white/10")}><Send size={12} /> {s.telegram_on && s.bot_username ? `@${s.bot_username}` : km ? "Telegram bot មិនទាន់ភ្ជាប់" : "Telegram bot not connected"}</span>
        </div>
      }
    >
      <div className="card flex gap-1 p-1.5">
        <Link href="/staff/hr" className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold", tab === "apps" ? "bg-primary text-white" : "text-forest hover:bg-cream")}><Users size={16} /> {km ? "ពាក្យសុំ" : "Applications"} ({(counts ?? []).length})</Link>
        <Link href="/staff/hr?tab=jobs" className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold", tab === "jobs" ? "bg-primary text-white" : "text-forest hover:bg-cream")}><Briefcase size={16} /> {km ? "ការងារ" : "Jobs"} ({(jobs ?? []).length})</Link>
        <Link href="/staff/hr?tab=salary" className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold", tab === "salary" ? "bg-primary text-white" : "text-forest hover:bg-cream")}><Wallet size={16} /> {km ? "ប្រាក់ខែ" : "Salaries"}</Link>
      </div>

      {tab === "salary" && (await (async () => {
        // each active staff member's salary: starting pay, raises, probation
        const people = (await getStaff()).filter((x) => x.status === "active");
        const st = await salarySteps(people.map((x) => x.user_id));
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
        return (
          <section className="space-y-3">
            {people.map((x) => (
              <div key={x.user_id} className="card space-y-2 p-3">
                <p className="px-1 font-bold text-forest">{(km && x.full_name_km) || x.full_name} <span className="text-xs font-semibold text-ink/45">· {x.staff_no} · {x.position ? (km && x.position.name_km) || x.position.name : "—"}</span></p>
                <SalaryPanel km={km} userId={x.user_id} positionRate={Number(x.position?.rate ?? 0)} unit={x.position ? (km ? PAY_TYPE[x.position.pay_type].km : PAY_TYPE[x.position.pay_type].en) : ""} steps={(st.get(x.user_id) ?? []).map((v) => ({ id: v.id, effective_from: v.effective_from, amount: v.amount, note: v.note }))} today={todayStr} canResetPin={access.admin} />
              </div>
            ))}
          </section>
        );
      })())}

      {tab === "salary" ? null : tab === "jobs" ? (
        <section className="space-y-3">
          <JobEditor km={km} />
          {await (async () => {
            const picked = await pickedByJob();
            return (jobs ?? []).map((j: any) => <JobEditor key={j.id} km={km} job={j} picked={picked.get(j.id) ?? 0} />);
          })()}
        </section>
      ) : (
        <>
          <div className="card space-y-3 p-4">
            <form className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input name="q" defaultValue={searchParams.q} placeholder={km ? "ស្វែងរកឈ្មោះ លេខទូរស័ព្ទ HR-0001…" : "Search name, phone, HR-0001…"} className="w-full rounded-2xl border border-black/10 bg-cream/40 py-2.5 pl-10 pr-4 text-base outline-none focus:border-primary" />
            </form>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <Link href={link({ s: undefined })} className={cn("flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", !searchParams.s ? "bg-primary text-white" : "bg-cream text-forest")}>{km ? "ទាំងអស់" : "All"}</Link>
              <Link href={link({ s: "past" })} className={cn("inline-flex flex-shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-bold transition hover:-translate-y-0.5", searchParams.s === "past" ? "bg-primary text-white shadow" : "bg-light-green text-primary")}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"><RefreshCcw size={11} strokeWidth={2.6} /></span> {km ? "អាចអញ្ជើញម្តងទៀត" : "Can invite again"} {n("rejected") + n("withdrawn") ? <span className={cn("rounded-full px-1.5 text-[10px] leading-4", searchParams.s === "past" ? "bg-white/25" : "bg-white shadow-sm")}>{n("rejected") + n("withdrawn")}</span> : null}
              </Link>
              {(Object.keys(HR_STATUS) as HrStatus[]).map((st) => (
                <Link key={st} href={link({ s: st })} className={cn("flex-shrink-0 rounded-full py-1 pl-1 pr-3 text-xs font-bold transition hover:-translate-y-0.5", searchParams.s === st ? "bg-primary text-white shadow" : "bg-cream text-forest")}>
                  <HrStatusChip status={st} label={km ? HR_STATUS[st].km : HR_STATUS[st].en} count={n(st)} active={searchParams.s === st} />
                </Link>
              ))}
            </div>
          </div>
          <section className="card p-2">
            {(apps ?? []).length === 0 && <p className="p-6 text-center text-sm text-ink/50">{km ? "មិនទាន់មានពាក្យសុំទេ" : "No applications yet"}</p>}
            <ul className="divide-y divide-black/5">
              {(apps ?? []).map((a: any) => {
                const unread = (a.hr_messages ?? []).filter((m: any) => !m.from_hr && !m.read_at).length;
                const st = HR_STATUS[a.status as HrStatus];
                return (
                  <li key={a.id}>
                    <Link href={`/staff/hr/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl p-3 hover:bg-cream/60">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-light-green font-display font-extrabold text-primary">{[...a.full_name][0]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-forest">{a.full_name}{a.full_name_km ? ` · ${a.full_name_km}` : ""}</span>
                        <span className="block truncate text-xs text-ink/50">{a.code} · {(km && a.job?.title_km) || a.job?.title || "—"} · {a.phone} · {when(a.created_at)}</span>
                      </span>
                      {a.rating && <span className="text-xs text-amber-500">{"★".repeat(a.rating)}</span>}
                      {a.tg_chat_id && <Send size={15} className="text-[#229ED9]" aria-label="Telegram" />}
                      {unread > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white"><MessageCircle size={11} /> {unread}</span>}
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11px] font-bold", st.tone)}><HrStatusIcon status={a.status} size={18} />{km ? st.km : st.en}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </StaffShell>
  );
}
