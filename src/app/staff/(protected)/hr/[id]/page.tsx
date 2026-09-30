import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail, MapPin, Calendar, GraduationCap, Briefcase, Languages, Wrench, Wallet, Send } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle, getPositions } from "@/lib/server/staff";
import { canHr, HR_STATUS, dt, type HrStatus } from "@/lib/server/hr";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ApplicantPanel } from "@/components/hr/HrBits";
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
  if (!a) notFound();
  const [{ data: msgs }, { data: events }, positions] = await Promise.all([
    db.from("hr_messages").select("id, from_hr, body, created_at").eq("applicant_id", a.id).order("created_at"),
    db.from("hr_events").select("kind, note, created_at").eq("applicant_id", a.id).order("created_at", { ascending: false }).limit(30),
    getPositions(),
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
    <StaffShell title={a.full_name} subtitle={`${a.code} · ${(km && a.job?.title_km) || a.job?.title || "—"}`} hero={<span className={cn("mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold", st.tone)}>{st.emoji} {km ? st.km : st.en}</span>}>
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
            {a.interview_at && <span>· 📅 {dt(a.interview_at, km)}</span>}
          </p>
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
          a={{ id: a.id, status: a.status, hr_note: a.hr_note, rating: a.rating, result_note: a.result_note, interview_place: a.interview_place, interview_note: a.interview_note, has_cv: Boolean(a.cv_path), cv_name: a.cv_name, telegram: Boolean(a.tg_chat_id), hired: Boolean(a.staff_user_id), position_id: a.job?.position_id ?? null }}
          msgs={(msgs ?? []) as any}
          positions={positions.map((p) => ({ id: p.id, name: (km && p.name_km) || p.name }))}
        />
      </div>
    </StaffShell>
  );
}
