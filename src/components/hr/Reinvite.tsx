"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCcw, Send, UserPlus, Loader2, Phone, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { inviteAgain, addToJobAgain } from "@/app/staff/(protected)/hr/actions";
import { cn } from "@/lib/utils/cn";

type Job = { id: string; title: string; title_km: string | null; salary: string | null };
type Invite = { id: string; status: string; telegram: boolean; created_at: string; job: string; new_applicant_id: string | null; new_code: string | null };

/** A past applicant (not selected / withdrew): ask them back for a new opening, or add them straight away. */
export function Reinvite({ km, applicantId, telegram, phone, jobs, invites }: { km: boolean; applicantId: string; telegram: boolean; phone: string; jobs: Job[]; invites: Invite[] }) {
  const router = useRouter();
  const [job, setJob] = useState(jobs[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const L = (en: string, k: string) => (km ? k : en);
  const field = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
  const ERR: Record<string, string> = { status: L("Only for past applicants.", "សម្រាប់តែអ្នកធ្លាប់ដាក់ពាក្យពីមុន"), job: L("That job is closed.", "ការងារនោះបានបិទ"), failed: L("Could not create it.", "បង្កើតមិនបាន") };
  const STATUS: Record<string, [string, string, string, typeof Clock3]> = {
    sent: ["Waiting for an answer", "រង់ចាំចម្លើយ", "bg-amber-50 text-amber-800", Clock3],
    accepted: ["Said yes", "យល់ព្រមមកវិញ", "bg-emerald-50 text-emerald-800", CheckCircle2],
    declined: ["Said no", "មិនមក", "bg-slate-100 text-slate-600", XCircle],
    added: ["Added by HR", "HR បានបញ្ចូល", "bg-sky-50 text-sky-800", UserPlus],
  };
  if (!jobs.length && !invites.length) return null;
  return (
    <section className="mt-5 overflow-hidden rounded-3xl ring-1 ring-primary/15">
      <div className="flex items-center gap-3 bg-gradient-to-r from-light-green to-white p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary shadow-soft"><RefreshCcw size={18} /></span>
        <div>
          <p className="font-display font-extrabold text-forest">{L("Invite again", "អញ្ជើញម្តងទៀត")}</p>
          <p className="text-xs text-ink/55">{L("A new opening? Ask this past applicant if they'd like to come — their CV is kept.", "មានការរើសថ្មី? សួរអ្នកធ្លាប់ដាក់ពាក្យនេះថាចង់មកធ្វើការទេ — CV ពីមុននៅរក្សាទុក។")}</p>
        </div>
      </div>
      {jobs.length > 0 && (
        <div className="space-y-2.5 p-4">
          <select value={job} onChange={(e) => setJob(e.target.value)} className={field}>
            {jobs.map((j) => <option key={j.id} value={j.id}>{(km && j.title_km) || j.title}{j.salary ? ` · ${j.salary}` : ""}</option>)}
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={L("A short message (optional)", "សារខ្លី (ជម្រើស)")} className={field} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={pending || !job} onClick={() => start(async () => {
              const r = await inviteAgain(applicantId, job, note);
              setMsg(r.error ? { ok: false, text: ERR[r.error] ?? r.error } : r.telegram ? { ok: true, text: L("Sent on Telegram ✓ — they answer with Yes / No.", "បានផ្ញើតាម Telegram ✓ — គាត់នឹងចុច ចង់មក / មិនអាច។") } : { ok: true, text: L(`Saved. No Telegram: please call ${r.phone}.`, `បានកត់ត្រា។ គាត់មិនបានភ្ជាប់ Telegram៖ សូមទូរស័ព្ទទៅ ${r.phone}។`) });
              router.refresh();
            })} className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50", telegram ? "bg-[#229ED9]" : "bg-slate-500")}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {telegram ? L("Ask on Telegram", "សួរតាម Telegram") : L("Note the invite (no Telegram)", "កត់ត្រាការអញ្ជើញ (គ្មាន Telegram)")}
            </button>
            <button type="button" disabled={pending || !job} onClick={() => confirm(L("They already said yes? Make a new application for this job now (same CV).", "គាត់យល់ព្រមរួចហើយ? បង្កើតពាក្យថ្មីសម្រាប់ការងារនេះឥឡូវ (ប្រើ CV ដដែល)។")) && start(async () => {
              const r = await addToJobAgain(applicantId, job);
              if (r.error) return setMsg({ ok: false, text: ERR[r.error] ?? r.error });
              router.push(`/staff/hr/${r.id}`);
            })} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <UserPlus size={16} /> {L("Add to this job now", "បញ្ចូលទៅការងារនេះឥឡូវ")}
            </button>
          </div>
          {!telegram && <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary"><Phone size={14} /> {phone}</a>}
          {msg && <p role="status" className={cn("rounded-xl px-3 py-2 text-sm font-bold", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{msg.text}</p>}
        </div>
      )}
      {invites.length > 0 && (
        <ul className="divide-y divide-black/5 border-t border-black/5 text-sm">
          {invites.map((v) => {
            const [en, kh, tone, Icon] = STATUS[v.status] ?? STATUS.sent;
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate font-bold text-forest">{v.job}</span>
                <span className="text-xs text-ink/45">{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(v.created_at))}{v.telegram ? " · Telegram" : ""}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold", tone)}><Icon size={12} /> {L(en, kh)}</span>
                {v.new_applicant_id && <Link href={`/staff/hr/${v.new_applicant_id}`} className="text-xs font-bold text-primary underline">{v.new_code}</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
