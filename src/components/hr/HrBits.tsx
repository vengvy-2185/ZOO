"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, FileText, Loader2, CalendarPlus, ThumbsUp, ThumbsDown, UserPlus, Send, Trash2, Star, Save, ChevronDown, ScanSearch, Undo2, Trophy, BadgeCheck, NotebookPen, MapPin, Lock } from "lucide-react";
import { setHrStatus, scheduleInterview, setResult, saveHrNote, messageApplicant, cvLink, hireApplicant, deleteApplicant, saveJob } from "@/app/staff/(protected)/hr/actions";
import { cn } from "@/lib/utils/cn";

const field = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base outline-none focus:border-primary";

export function CopyLink({ url, km }: { url: string; km: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => (setDone(true), setTimeout(() => setDone(false), 1800)))} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#1D4ED8]">
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? (km ? "បានចម្លង" : "Copied") : km ? "ចម្លង link ដាក់ពាក្យ" : "Copy the apply link"}
    </button>
  );
}

type Job = { id: string; slug: string; title: string; title_km: string | null; department: string | null; description: string | null; description_km: string | null; requirements: string | null; requirements_km: string | null; salary: string | null; job_type: string; open: boolean };

/** Add / change a job (open or closed). */
export function JobEditor({ km, job }: { km: boolean; job?: Job }) {
  const router = useRouter();
  const [open, setOpen] = useState(!job ? false : false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const L = (en: string, k: string) => (km ? k : en);
  return (
    <div className="card overflow-hidden p-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={cn("h-2.5 w-2.5 rounded-full", !job ? "bg-primary" : job.open ? "bg-emerald-500" : "bg-slate-300")} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-forest">{job ? (km && job.title_km) || job.title : L("＋ Add a job", "＋ បន្ថែមការងារ")}</span>
          {job && <span className="block text-xs text-ink/50">/careers/{job.slug} · {job.open ? L("open", "កំពុងទទួល") : L("closed", "បិទ")}</span>}
        </span>
        <ChevronDown size={18} className={cn("text-ink/40 transition", open && "rotate-180")} />
      </button>
      {open && (
        <form
          action={(fd) =>
            start(async () => {
              const r = await saveJob(fd);
              setMsg(r.error ? (r.error === "slug" ? L("That link name is used by another job", "ឈ្មោះ link នេះប្រើរួចហើយ") : r.error) : L("Saved ✓", "បានរក្សាទុក ✓"));
              if (!r.error) router.refresh();
            })
          }
          className="grid gap-3 border-t border-black/5 p-4 sm:grid-cols-2"
        >
          {job && <input type="hidden" name="id" value={job.id} />}
          <input name="title" required defaultValue={job?.title} placeholder={L("Title (English)", "ចំណងជើង (អង់គ្លេស)")} className={field} />
          <input name="title_km" defaultValue={job?.title_km ?? ""} placeholder={L("Title (Khmer)", "ចំណងជើង (ខ្មែរ)")} className={field} />
          <input name="department" defaultValue={job?.department ?? ""} placeholder={L("Department", "ផ្នែក")} className={field} />
          <input name="salary" defaultValue={job?.salary ?? ""} placeholder={L("Salary, e.g. $250 – $350", "ប្រាក់ខែ ឧ. $250 – $350")} className={field} />
          <select name="job_type" defaultValue={job?.job_type ?? "full-time"} className={field}>
            <option value="full-time">{L("Full time", "ពេញម៉ោង")}</option>
            <option value="part-time">{L("Part time", "ក្រៅម៉ោង")}</option>
            <option value="intern">{L("Internship", "កម្មសិក្សា")}</option>
            <option value="volunteer">{L("Volunteer", "ស្ម័គ្រចិត្ត")}</option>
          </select>
          <input name="slug" defaultValue={job?.slug ?? ""} placeholder={L("Link name (e.g. animal-keeper)", "ឈ្មោះ link (ឧ. animal-keeper)")} className={field} />
          <textarea name="description" rows={3} defaultValue={job?.description ?? ""} placeholder={L("The job (English)", "ការងារ (អង់គ្លេស)")} className={field} />
          <textarea name="description_km" rows={3} defaultValue={job?.description_km ?? ""} placeholder={L("The job (Khmer)", "ការងារ (ខ្មែរ)")} className={field} />
          <textarea name="requirements" rows={3} defaultValue={job?.requirements ?? ""} placeholder={L("What we look for (English)", "លក្ខខណ្ឌ (អង់គ្លេស)")} className={field} />
          <textarea name="requirements_km" rows={3} defaultValue={job?.requirements_km ?? ""} placeholder={L("What we look for (Khmer)", "លក្ខខណ្ឌ (ខ្មែរ)")} className={field} />
          <label className="flex items-center gap-2 text-sm font-bold text-forest"><input type="checkbox" name="open" defaultChecked={job ? job.open : true} className="h-5 w-5 accent-[#176B3A]" /> {L("Taking applications", "កំពុងទទួលពាក្យ")}</label>
          <div className="flex items-center justify-end gap-3">
            {msg && <span role="status" className="text-sm font-bold text-primary">{msg}</span>}
            <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white disabled:opacity-60">{pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {L("Save", "រក្សាទុក")}</button>
          </div>
        </form>
      )}
    </div>
  );
}

type A = { id: string; status: string; hr_note: string | null; rating: number | null; result_note: string | null; interview_place: string | null; interview_note: string | null; interview_map: string | null; has_cv: boolean; cv_name: string | null; telegram: boolean; hired: boolean; position_id: string | null };

/** Everything HR does with one applicant. */
export function ApplicantPanel({ km, admin, a, msgs, positions }: { km: boolean; admin: boolean; a: A; msgs: { id: string; from_hr: boolean; body: string; created_at: string }[]; positions: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [info, setInfo] = useState("");
  const [creds, setCreds] = useState<{ staffNo: string; password: string; told?: boolean } | null>(null);
  const [pos, setPos] = useState(a.position_id ?? positions[0]?.id ?? "");
  const [payStart, setPayStart] = useState("");
  const [payMonths, setPayMonths] = useState("3");
  const [payAfter, setPayAfter] = useState("");
  const L = (en: string, k: string) => (km ? k : en);
  const run = (fn: () => Promise<unknown>, done?: string) =>
    start(async () => {
      await fn();
      if (done) setInfo(done);
      router.refresh();
    });
  const card = "card space-y-3 p-4";
  // passed / not selected / hired / withdrawn: final, the buttons are gone
  const decided = ["offer", "rejected", "hired", "withdrawn"].includes(a.status);
  const LOCK = L("This application is already decided, it can't be changed.", "ពាក្យនេះបានសម្រេចរួចហើយ មិនអាចប្តូរបានទេ។");
  const act = (fn: () => Promise<unknown>, done: string) =>
    start(async () => {
      const r = (await fn()) as { error?: string } | undefined;
      setInfo(r?.error === "locked" ? LOCK : r?.error === "map" ? L("The map link must start with https:// (or be coordinates like 11.56, 104.92)", "តំណផែនទីត្រូវចាប់ផ្តើមដោយ https:// (ឬជាកូអរដោនេ ឧ. 11.56, 104.92)") : done);
      router.refresh();
    });
  const tgNote = a.telegram ? L(" · sent on Telegram", " · បានផ្ញើតាម Telegram") : "";

  return (
    <aside className="space-y-4">
      {info && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">{info}</p>}
      <div className={card}>
        <button type="button" disabled={!a.has_cv || pending} onClick={() => start(async () => { const u = await cvLink(a.id); if (u) window.open(u, "_blank", "noopener"); })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-extrabold text-white disabled:opacity-50">
          <FileText size={18} /> {L("Open CV", "បើក CV")} {a.cv_name ? <span className="max-w-[10rem] truncate text-xs font-semibold opacity-80">({a.cv_name})</span> : null}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={pending || decided || a.status === "screening"} onClick={() => act(() => setHrStatus(a.id, "screening"), L("Marked as reviewing", "កំពុងពិនិត្យ") + tgNote)} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2 text-sm font-bold text-amber-800 disabled:opacity-40"><ScanSearch size={16} /> {L("Reviewing", "ពិនិត្យ")}</button>
          <button type="button" disabled={pending || a.status === "hired" || a.status === "rejected" || a.status === "withdrawn"} onClick={() => confirm(L("Mark as withdrawn? This is final.", "សម្គាល់ថាដកពាក្យ? មិនអាចប្តូរវិញបានទេ។")) && act(() => setHrStatus(a.id, "withdrawn"), L("Withdrawn", "បានដកពាក្យ"))} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"><Undo2 size={16} /> {L("Withdrawn", "ដកពាក្យ")}</button>
        </div>
      </div>

      {!decided && (
      <form className={card} action={(fd) => act(() => scheduleInterview(a.id, fd), L("Interview set", "បានណាត់សម្ភាសន៍") + tgNote)}>
        <p className="flex items-center gap-2 font-display font-extrabold text-forest"><CalendarPlus size={18} /> {L("Interview", "ណាត់សម្ភាសន៍")}</p>
        <input type="datetime-local" name="at" required className={field} />
        <input name="place" defaultValue={a.interview_place ?? ""} placeholder={L("Where (e.g. HR office, main gate)", "ទីកន្លែង (ឧ. ការិយាល័យ HR)")} className={field} />
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink/55"><MapPin size={13} /> {L("Location on the map (Google Maps link)", "ទីតាំងលើផែនទី (តំណ Google Maps)")}</span>
          <input name="map" type="text" inputMode="url" defaultValue={a.interview_map ?? ""} placeholder="https://maps.app.goo.gl/…" className={field} />
          <span className="mt-1 block text-[11px] text-ink/45">{L("In Google Maps: tap the place → Share → Copy link. The applicant gets a map pin in Telegram.", "ក្នុង Google Maps៖ ចុចទីតាំង → Share → Copy link។ បេក្ខជននឹងទទួលបានម្ជុលទីតាំងក្នុង Telegram។")}</span>
        </label>
        <input name="note" defaultValue={a.interview_note ?? ""} placeholder={L("Note (bring ID card…)", "កំណត់សម្គាល់ (យកអត្តសញ្ញាណប័ណ្ណ…)")} className={field} />
        <button disabled={pending} className="w-full rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-60">{pending ? <Loader2 size={16} className="mx-auto animate-spin" /> : L("Send the invitation", "ផ្ញើការអញ្ជើញ")}</button>
      </form>
      )}

      <div className={card}>
        <p className="flex items-center gap-2 font-display font-extrabold text-forest"><Trophy size={18} className="text-amber-500" /> {L("Result", "លទ្ធផល")}</p>
        {decided ? (
          <div className={cn("flex items-start gap-2 rounded-2xl px-3 py-3 text-sm font-bold", a.status === "rejected" || a.status === "withdrawn" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800")}>
            <Lock size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              {a.status === "rejected" ? L("Not selected", "មិនជាប់") : a.status === "withdrawn" ? L("Withdrawn", "ដកពាក្យ") : a.status === "hired" ? L("Hired", "ក្លាយជាបុគ្គលិក") : L("Passed", "ជាប់")}
              <span className="block text-xs font-semibold opacity-70">{L("Final: decided once, can't be changed.", "សម្រេចរួច មិនអាចប្តូរបានទេ។")}</span>
              {a.result_note && <span className="mt-1 block whitespace-pre-wrap text-xs font-medium opacity-80">{a.result_note}</span>}
            </span>
          </div>
        ) : (
          <>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={L("Message with the result (optional)", "សារជាមួយលទ្ធផល (ជម្រើស)")} className={field} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={pending} onClick={() => confirm(L("Passed? This is final and is sent to the applicant.", "ជាប់? លទ្ធផលនេះមិនអាចប្តូរបានទេ ហើយនឹងផ្ញើទៅបេក្ខជន។")) && act(() => setResult(a.id, true, note), L("Passed", "ជាប់") + tgNote)} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 font-bold text-white disabled:opacity-50">{pending ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />} {L("Passed", "ជាប់")}</button>
              <button type="button" disabled={pending} onClick={() => confirm(L("Not selected? This is final and is sent to the applicant.", "មិនជាប់? លទ្ធផលនេះមិនអាចប្តូរបានទេ ហើយនឹងផ្ញើទៅបេក្ខជន។")) && act(() => setResult(a.id, false, note), L("Not selected", "មិនជាប់") + tgNote)} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-200 py-2.5 font-bold text-slate-700 disabled:opacity-50"><ThumbsDown size={16} /> {L("Not selected", "មិនជាប់")}</button>
            </div>
          </>
        )}
      </div>

      {admin && !a.hired && (a.status === "offer" || a.status === "interview") && (
        <div className={cn(card, "ring-2 ring-emerald-200")}>
          <p className="flex items-center gap-2 font-display font-extrabold text-forest"><UserPlus size={18} /> {L("Make them staff", "បង្កើតជាបុគ្គលិក")}</p>
          <select value={pos} onChange={(e) => setPos(e.target.value)} className={field}>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Starting pay $", "ប្រាក់ខែពេលចូល $")}</span><input value={payStart} onChange={(e) => setPayStart(e.target.value)} type="number" min="0" step="0.01" placeholder={L("position", "តាមតួនាទី")} className={field} /></label>
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Probation (months)", "សាកល្បង (ខែ)")}</span><input value={payMonths} onChange={(e) => setPayMonths(e.target.value)} type="number" min="1" max="24" className={field} /></label>
            <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Then $", "បន្ទាប់មក $")}</span><input value={payAfter} onChange={(e) => setPayAfter(e.target.value)} type="number" min="0" step="0.01" placeholder={L("optional", "ជម្រើស")} className={field} /></label>
          </div>
          <p className="text-[11px] text-ink/50">{L("Leave blank to pay the position's rate. The raise starts by itself after the probation; you can raise again later.", "ទុកទទេ = ប្រាក់ខែតាមតួនាទី។ ការដំឡើងចាប់ផ្តើមដោយខ្លួនឯងក្រោយសាកល្បង ហើយអាចដំឡើងទៀតពេលក្រោយ។")}</p>
          <button
            type="button"
            disabled={pending || !pos}
            onClick={() =>
              start(async () => {
                if (!confirm(L("Create the staff account now?", "បង្កើតគណនីបុគ្គលិកឥឡូវ?"))) return;
                const num = (v: string) => (v.trim() === "" ? null : Number(v));
                const r = await hireApplicant(a.id, pos, { start: num(payStart), months: payAfter.trim() ? num(payMonths) : null, after: num(payAfter) });
                if (r.error) setInfo(r.error);
                else setCreds({ staffNo: r.staffNo!, password: r.password!, told: r.told });
                router.refresh();
              })
            }
            className="w-full rounded-xl bg-emerald-600 py-3 font-extrabold text-white"
          >
            {pending ? <Loader2 size={16} className="mx-auto animate-spin" /> : L("Hire · create Staff ID", "ជ្រើសរើស · បង្កើតលេខសម្គាល់បុគ្គលិក")}
          </button>
        </div>
      )}
      {creds && (
        <div role="status" className="card space-y-1 bg-emerald-50 p-4 text-emerald-900">
          <p className="flex items-center gap-2 font-extrabold"><BadgeCheck size={18} /> {L("Staff account created", "បានបង្កើតគណនីបុគ្គលិក")}</p>
          <p>{L("Staff ID", "លេខសម្គាល់")}: <b className="font-mono">{creds.staffNo}</b></p>
          <p>{L("Password", "ពាក្យសម្ងាត់")}: <b className="font-mono">{creds.password}</b></p>
          <p className="text-xs">{creds.told ? L("Also sent to them on Telegram.", "បានផ្ញើទៅគាត់តាម Telegram ផងដែរ។") : L("Give these to them (Telegram not linked).", "សូមប្រគល់ព័ត៌មាននេះទៅគាត់ (មិនទាន់ភ្ជាប់ Telegram)។")}</p>
        </div>
      )}

      <div className={card}>
        <p className="flex items-center gap-2 font-display font-extrabold text-forest"><Send size={17} className="text-[#229ED9]" /> {L("Messages", "សារ")} {!a.telegram && <span className="text-xs font-semibold text-ink/40">({L("Telegram not linked", "មិនទាន់ភ្ជាប់ Telegram")})</span>}</p>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {msgs.length === 0 && <p className="text-sm text-ink/45">{L("No messages yet", "មិនទាន់មានសារ")}</p>}
          {msgs.map((m) => (
            <div key={m.id} className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm", m.from_hr ? "ml-auto bg-primary text-white" : "bg-cream text-ink/85")}>
              {m.body}
              <span className={cn("mt-0.5 block text-[10px]", m.from_hr ? "text-white/70" : "text-ink/40")}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(m.created_at))}</span>
            </div>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={L("Write to the applicant…", "សរសេរទៅបេក្ខជន…")} className={field} />
        <button type="button" disabled={pending || !text.trim()} onClick={() => run(async () => { await messageApplicant(a.id, text); setText(""); }, L("Sent", "បានផ្ញើ") + tgNote)} className="w-full rounded-xl bg-[#229ED9] py-2.5 font-bold text-white disabled:opacity-50">{L("Send", "ផ្ញើ")}</button>
      </div>

      <form className={card} action={(fd) => run(() => saveHrNote(a.id, fd), L("Note saved", "បានរក្សាទុក"))}>
        <p className="flex items-center gap-2 font-display font-extrabold text-forest"><NotebookPen size={18} /> {L("HR note (only HR sees it)", "កំណត់ចំណាំ HR (មានតែ HR ឃើញ)")}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} defaultChecked={a.rating === n} className="peer sr-only" />
              <Star size={24} className="text-slate-300 peer-checked:fill-amber-400 peer-checked:text-amber-400" />
            </label>
          ))}
        </div>
        <textarea name="hr_note" rows={3} defaultValue={a.hr_note ?? ""} className={field} />
        <button disabled={pending} className="w-full rounded-xl bg-forest py-2.5 font-bold text-white">{L("Save note", "រក្សាទុក")}</button>
      </form>

      {admin && (
        <button type="button" onClick={() => { if (confirm(L("Delete this application and its CV for good?", "លុបពាក្យសុំ និង CV នេះជាស្ថាពរ?"))) start(async () => { await deleteApplicant(a.id); router.push("/staff/hr"); }); }} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-red-600 ring-1 ring-red-200">
          <Trash2 size={15} /> {L("Delete application", "លុបពាក្យសុំ")}
        </button>
      )}
    </aside>
  );
}
