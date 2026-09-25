import { AlertTriangle, CheckCircle2, CircleDot, Clock, MapPin, Wrench } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { IssueForm } from "@/components/staff/StaffForms";
import { cn } from "@/lib/utils/cn";
import { setIssueStatus } from "../actions";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Report a problem", "រាយការណ៍បញ្ហា");

const CAT = {
  repair: { en: "Repair", km: "ជួសជុល" },
  cleaning: { en: "Cleaning", km: "សម្អាត" },
  animal: { en: "Animal", km: "សត្វ" },
  safety: { en: "Safety", km: "សុវត្ថិភាព" },
  visitor: { en: "Visitor", km: "ភ្ញៀវ" },
  other: { en: "Other", km: "ផ្សេងៗ" },
} as const;

/** Anyone reports a problem (with a photo); managers see every open one and move it to done. */
export default async function IssuesPage({ searchParams }: { searchParams: { c?: string; all?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  let q = db.from("staff_issues").select("*").order("status").order("urgent", { ascending: false }).order("created_at", { ascending: false }).limit(60);
  if (!manager) q = q.eq("user_id", userId);
  else if (!searchParams.all) q = q.neq("status", "done");
  const { data: issues } = await q;
  const ids = [...new Set((issues ?? []).map((i: any) => i.user_id).filter(Boolean))];
  const { data: who } = ids.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
  const name = new Map((who ?? []).map((w: any) => [w.user_id, w.full_name]));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const S = km ? { open: "ថ្មី", in_progress: "កំពុងដោះស្រាយ", done: "រួចរាល់" } : { open: "New", in_progress: "In progress", done: "Fixed" };
  const L = km
    ? { title: "រាយការណ៍បញ្ហា", sub: "ឃើញអ្វីខូច កខ្វក់ គ្រោះថ្នាក់ ឬសត្វត្រូវការជំនួយ? រាយការណ៍នៅទីនេះ។", new: "រាយការណ៍ថ្មី", list: manager ? "បញ្ហាដែលត្រូវដោះស្រាយ" : "បញ្ហាដែលខ្ញុំបានរាយការណ៍", none: "គ្មានបញ្ហាទេ។ ល្អណាស់!", urgent: "បន្ទាន់", start: "ចាប់ផ្តើមដោះស្រាយ", fixed: "រួចរាល់", reopen: "បើកវិញ", showAll: "បង្ហាញទាំងរួចរាល់", by: "ដោយ" }
    : { title: "Report a problem", sub: "Something broken, dirty or unsafe, or an animal that needs help? Report it here.", new: "New report", list: manager ? "Problems to handle" : "My reports", none: "No problems. Great!", urgent: "Urgent", start: "Start", fixed: "Fixed", reopen: "Reopen", showAll: "Show fixed too", by: "by" };

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Wrench size={20} className="text-[#1D4ED8]" /> {L.new}</h2>
          <IssueForm km={km} defaultCategory={searchParams.c && searchParams.c in CAT ? searchParams.c : "repair"} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold text-forest">{L.list}</h2>
            {manager && (
              <a href={searchParams.all ? "/staff/issues" : "/staff/issues?all=1"} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1E3A8A] shadow-soft">{L.showAll}</a>
            )}
          </div>
          <div className="space-y-2">
            {(issues ?? []).length === 0 && <p className="card p-6 text-center text-sm text-ink/55">{L.none}</p>}
            {(issues ?? []).map((i: any) => (
              <div key={i.id} className={cn("card p-4", i.urgent && i.status !== "done" && "ring-2 ring-red-300", i.status === "done" && "opacity-70")}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.photo_url && <img src={i.photo_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#1E3A8A]">{km ? CAT[i.category as keyof typeof CAT]?.km : CAT[i.category as keyof typeof CAT]?.en}</span>
                      {i.urgent && i.status !== "done" && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600"><AlertTriangle size={11} /> {L.urgent}</span>}
                      <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", i.status === "done" ? "bg-[#1D4ED8] text-white" : i.status === "in_progress" ? "bg-[#DBEAFE] text-[#1E3A8A]" : "bg-white text-ink/60 ring-1 ring-black/10")}>
                        {i.status === "done" ? <CheckCircle2 size={11} /> : i.status === "in_progress" ? <Clock size={11} /> : <CircleDot size={11} />} {S[i.status as keyof typeof S]}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-forest"><MapPin size={13} className="text-[#1D4ED8]" /> {i.place}</p>
                    <p className="text-sm text-ink/70">{i.note}</p>
                    <p className="mt-1 text-[11px] text-ink/40">{name.get(i.user_id) ?? "Admin"} · {when(i.created_at)}</p>
                  </div>
                </div>
                {manager && (
                  <div className="mt-3 flex gap-2">
                    {i.status === "open" && (
                      <form action={setIssueStatus.bind(null, i.id, "in_progress")} className="flex-1"><button className="w-full rounded-xl bg-[#EEF2FF] py-2 text-xs font-bold text-[#1E3A8A]">{L.start}</button></form>
                    )}
                    {i.status !== "done" ? (
                      <form action={setIssueStatus.bind(null, i.id, "done")} className="flex-1"><button className="w-full rounded-xl bg-[#1D4ED8] py-2 text-xs font-bold text-white">{L.fixed}</button></form>
                    ) : (
                      <form action={setIssueStatus.bind(null, i.id, "open")} className="flex-1"><button className="w-full rounded-xl bg-white py-2 text-xs font-bold text-ink/60 ring-1 ring-black/10">{L.reopen}</button></form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
