import Link from "next/link";
import { HrStatusIcon } from "@/components/hr/HrStatusIcon";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail, MapPin, Calendar, GraduationCap, Briefcase, Languages, Wrench, Wallet, Send, CalendarClock } from "lucide-react";
import { interviewMapUrl } from "@/lib/server/hr";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle, getPositions } from "@/lib/server/staff";
import { canHr, HR_STATUS, dt, type HrStatus } from "@/lib/server/hr";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ApplicantPanel } from "@/components/hr/HrBits";
import { Reinvite } from "@/components/hr/Reinvite";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Applicant", "បេក្ខជន");

/** One applicant: their details, CV, the HR steps, and the conversation (Telegram). */
export default async function Applicant({ params }: { params: { id: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!canHr(access) || !/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("*, job:hr_jobs(title, title_km, position_id)").eq("id", params.id).maybeSingle();
  // the map link used last time (most interviews are at the same place)
  const lastMap = ((await db.from("hr_applicants").select("interview_map").not("interview_map", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle()).data?.interview_map as string | undefined) ?? null;
  if (!a) notFound();
  const past = ["rejected", "withdrawn"].includes(a.status);
  const [{ data: msgs }, { data: events }, positions, { data: openJobs }, { data: invRows }, { data: prev }, { data: later }] = await Promise.all([
    db.from("hr_messages").select("id, from_hr, body, created_at").eq("applicant_id", a.id).order("created_at"),
    // (asking a past applicant back: open jobs, earlier invites, the linked applications)
    db.from("hr_events").select("kind, note, created_at").eq("applicant_id", a.id).order("created_at", { ascending: false }).limit(30),
    getPositions(),
    past ? db.from("hr_jobs").select("id, title, title_km, salary").eq("open", true).order("sort") : Promise.resolve({ data: [] as any[] }),
    db.from("hr_invites").select("id, status, telegram, created_at, new_applicant_id, job:hr_jobs(title, title_km), new:hr_applicants!hr_invites_new_applicant_id_fkey(code)").eq("applicant_id", a.id).order("created_at", { ascending: false }),
    a.previous_id ? db.from("hr_applicants").select("id, code, status").eq("id", a.previous_id).maybeSingle() : Promise.resolve({ data: null as any }),
    db.from("hr_applicants").select("id, code, status").eq("previous_id", a.id).order("created_at"),
  ]);
  // opening the page = the questions have been seen
  await db.from("hr_messages").update({ read_at: new Date().toISOString() }).eq("applicant_id", a.id).eq("from_hr", false).is("read_at", null);
  const st = HR_STATUS[a.status as HrStatus];
  const row = (Icon: any, label: string, v?: string | null) =>
    v ? (
      <div className="flex gap-3 py-2">
        <Icon size={17} className="mt-0.5 flex-shrink-0 text-primary" />
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p><p className="whitespace-pre-line text-sm text-ink/80">{v}</p></div>
      </div>
    ) : null;
  const L = (en: string, k: string) => (km ? k : en);
  return (
    <StaffShell title={a.full_name} subtitle={`${a.code} · ${(km && a.job?.title_km) || a.job?.title || "—"}`} hero={<span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-bold", st.tone)}><HrStatusIcon status={a.status} size={20} />{km ? st.km : st.en}</span>}>
      <Link href="/staff/hr" className="inline-flex items-center gap-1 text-sm font-bold text-white md:text-primary"><ChevronLeft size={16} /> {L("All applications", "ពាក្យសុំទាំងអស់")}</Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <section className="card p-5">
          <h2 className="font-display text-lg font-extrabold text-forest">{L("Details", "ព័ត៌មាន")}</h2>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {row(Phone, L("Phone", "ទូរស័ព្ទ"), a.phone)}
            {row(Mail, "Email", a.email)}
            {row(Calendar, L("Born", "ថ្ងៃកំណើត"), a.birth_date)}
            {row(MapPin, L("Address", "អាសយដ្ឋាន"), a.address)}
            {row(Languages, L("Languages", "ភាសា"), a.languages)}
            {row(Wrench, L("Skills", "ជំនាញ"), a.skills)}
            {row(Wallet, L("Expected salary", "ប្រាក់ខែរំពឹងទុក"), a.expected_salary)}
            {row(Calendar, L("Can start", "អាចចាប់ផ្តើម"), a.available_from)}
          </div>
          {row(GraduationCap, L("Education", "ការសិក្សា"), a.education)}
          {row(Briefcase, L("Experience", "បទពិសោធន៍"), a.experience)}
          {row(Briefcase, L("Why here", "ហេតុអ្វីចង់ធ្វើការ"), a.about)}
          <p className="mt-3 flex items-center gap-2 text-xs text-ink/50">
            <Send size={13} className={a.tg_chat_id ? "text-[#229ED9]" : ""} /> {a.tg_chat_id ? `Telegram ✓${a.tg_username ? ` @${a.tg_username}` : ""}` : L("Telegram not linked yet", "មិនទាន់ភ្ជាប់ Telegram")}
            {a.interview_at && <span className="inline-flex items-center gap-1">· <CalendarClock size={13} /> {dt(a.interview_at, km)}</span>}
            {a.interview_at && interviewMapUrl(a) && (
              <a href={interviewMapUrl(a)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-primary underline">
                <MapPin size={13} /> {a.interview_place || L("Map", "ផែនទី")}
              </a>
            )}
          </p>
          {(prev || (later ?? []).length > 0) && (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-cream/70 px-3 py-2 text-xs text-ink/65">
              {prev && <span>↩ {L("Applied before:", "ធ្លាប់ដាក់ពាក្យ៖")} <Link href={`/staff/hr/${prev.id}`} className="font-bold text-primary underline">{prev.code}</Link> ({(km ? HR_STATUS[prev.status as HrStatus]?.km : HR_STATUS[prev.status as HrStatus]?.en) ?? prev.status})</span>}
              {(later ?? []).map((x: any) => <span key={x.id}>↪ {L("Came back:", "បានមកវិញ៖")} <Link href={`/staff/hr/${x.id}`} className="font-bold text-primary underline">{x.code}</Link></span>)}
            </p>
          )}
          {(past || (invRows ?? []).length > 0) && (
            <Reinvite
              km={km}
              applicantId={a.id}
              telegram={Boolean(a.tg_chat_id)}
              phone={a.phone}
              jobs={past ? ((openJobs ?? []) as any) : []}
              invites={((invRows ?? []) as any[]).map((v) => ({ id: v.id, status: v.status, telegram: v.telegram, created_at: v.created_at, job: (km && v.job?.title_km) || v.job?.title || "—", new_applicant_id: v.new_applicant_id, new_code: v.new?.code ?? null }))}
            />
          )}
          <h3 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-ink/40">{L("Timeline", "ប្រវត្តិ")}</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink/60">
            {(events ?? []).map((e: any, i: number) => (
              <li key={i}>• {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(e.created_at))} — {e.kind}{e.note ? ` (${e.note})` : ""}</li>
            ))}
          </ul>
        </section>
        <ApplicantPanel
          km={km}
          admin={access.admin}
          a={{ id: a.id, status: a.status, hr_note: a.hr_note, rating: a.rating, result_note: a.result_note, interview_place: a.interview_place, interview_note: a.interview_note, interview_map: a.interview_map ?? lastMap, has_cv: Boolean(a.cv_path), cv_name: a.cv_name, telegram: Boolean(a.tg_chat_id), hired: Boolean(a.staff_user_id), position_id: a.job?.position_id ?? null }}
          msgs={(msgs ?? []) as any}
          positions={positions.map((p) => ({ id: p.id, name: (km && p.name_km) || p.name }))}
        />
      </div>
    </StaffShell>
  );
}
