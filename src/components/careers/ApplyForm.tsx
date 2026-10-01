"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { FileUp, Loader2, CheckCircle2, AlertCircle, Send, X, Briefcase, UserRound, Phone, GraduationCap, FileText, Clock, Wallet, MapPin, ChevronDown, Check } from "lucide-react";
import { applyForJob, cvUploadSlot, type ApplyState } from "@/app/careers/actions";
import { createClient } from "@/lib/supabase/client";
import { JOB_TYPE, MONTHS_EN, MONTHS_KM, type OpenJob } from "@/lib/careers";
import { cn } from "@/lib/utils/cn";

function Submit({ km, disabled }: { km: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-white shadow-lift transition active:scale-[.98] disabled:opacity-50">
      {pending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} {pending ? (km ? "កំពុងផ្ញើ…" : "Sending…") : km ? "ផ្ញើពាក្យសុំ" : "Send my application"}
    </button>
  );
}

const ERR: Record<string, [string, string]> = {
  invalid: ["Please check the form.", "សូមពិនិត្យព័ត៌មានក្នុងពាក្យម្តងទៀត"],
  full_name: ["Please write your full name (at least 2 letters).", "សូមសរសេរឈ្មោះពេញ (យ៉ាងតិច ២ អក្សរ)"],
  phone: ["The phone number doesn't look right (e.g. 012 345 678).", "លេខទូរស័ព្ទមិនត្រឹមត្រូវ (ឧ. 012 345 678)"],
  email: ["The email doesn't look right.", "Email មិនត្រឹមត្រូវ"],
  birth_date: ["Please choose day, month and year of birth.", "សូមជ្រើស ថ្ងៃ ខែ ឆ្នាំកំណើតឲ្យគ្រប់"],
  available_from: ["Please choose the full start date.", "សូមជ្រើសថ្ងៃចាប់ផ្តើមឲ្យគ្រប់"],
  job: ["Please choose a job.", "សូមជ្រើសការងារ"],
  cv: ["Please add your CV.", "សូមភ្ជាប់ CV របស់អ្នក"],
  consent: ["Please tick the box to agree.", "សូមធីកយល់ព្រម"],
  closed: ["This job is closed.", "ការងារនេះបិទទទួលពាក្យហើយ"],
  limit: ["Too many tries, please wait a while.", "ព្យាយាមច្រើនពេក សូមរង់ចាំបន្តិច"],
  type: ["The CV must be PDF, Word or a photo.", "CV ត្រូវជា PDF, Word ឬរូបថត"],
  size: ["The CV is too big (10 MB at most).", "CV ធំពេក (អតិបរមា 10 MB)"],
  upload: ["The CV could not be uploaded, try again.", "បញ្ចូល CV មិនបាន សូមសាកម្តងទៀត"],
};

const LANGS: [string, string][] = [["Khmer", "ខ្មែរ"], ["English", "អង់គ្លេស"], ["Chinese", "ចិន"], ["Thai", "ថៃ"], ["Vietnamese", "វៀតណាម"], ["French", "បារាំង"]];

/** Day · month · year as three lists (clearer than the browser's mm/dd/yyyy box, and in Khmer). */
function DateParts({ name, km, years, field, onChange }: { name: string; km: boolean; years: number[]; field: string; onChange?: (v: string) => void }) {
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const days = m ? new Date(Number(y) || 2000, Number(m), 0).getDate() : 31;
  const day = d && Number(d) > days ? "" : d;
  const value = day && m && y ? `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  const partial = Boolean(day || m || y) && !value;
  useEffect(() => onChange?.(partial ? "partial" : value), [value, partial, onChange]);
  const sel = cn(field, "appearance-none pr-8");
  const wrap = (el: React.ReactNode) => (
    <div className="relative">
      {el}
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40" />
    </div>
  );
  return (
    <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2">
      <input type="hidden" name={name} value={value} />
      {wrap(
        <select aria-label={km ? "ថ្ងៃ" : "Day"} value={day} onChange={(e) => setD(e.target.value)} className={sel}>
          <option value="">{km ? "ថ្ងៃ" : "Day"}</option>
          {Array.from({ length: days }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
        </select>
      )}
      {wrap(
        <select aria-label={km ? "ខែ" : "Month"} value={m} onChange={(e) => setM(e.target.value)} className={sel}>
          <option value="">{km ? "ខែ" : "Month"}</option>
          {(km ? MONTHS_KM : MONTHS_EN).map((n, i) => <option key={i} value={String(i + 1)}>{n}</option>)}
        </select>
      )}
      {wrap(
        <select aria-label={km ? "ឆ្នាំ" : "Year"} value={y} onChange={(e) => setY(e.target.value)} className={sel}>
          <option value="">{km ? "ឆ្នាំ" : "Year"}</option>
          {years.map((n) => <option key={n} value={String(n)}>{n}</option>)}
        </select>
      )}
    </div>
  );
}

/** One numbered part of the form. */
function Section({ km, n, icon: Icon, title, children }: { km: boolean; n: number; icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-black/5 bg-white p-4 shadow-soft sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-white">{km ? "០១២៣៤៥៦៧៨៩"[n] : n}</span>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Icon size={18} className="text-primary" /> {title}</h3>
      </div>
      {children}
    </fieldset>
  );
}

/** The application form: the job (already chosen from the page), personal details, experience, and the CV. */
export function ApplyForm({ jobs, jobId, km }: { jobs: OpenJob[]; jobId: string; km: boolean }) {
  const router = useRouter();
  const [state, action] = useFormState<ApplyState, FormData>(applyForJob, {});
  const [job, setJob] = useState(jobId);
  const [cv, setCv] = useState<{ name: string; size: number; path?: string; busy: boolean; err?: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [gender, setGender] = useState("");
  const [langs, setLangs] = useState<string[]>([]);
  const [otherLang, setOtherLang] = useState("");
  const [agree, setAgree] = useState(false);
  const [birth, setBirth] = useState("");
  const [start, setStart] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.token) router.push(`/careers/done/${state.token}`);
  }, [state.token, router]);

  const L = (en: string, kh: string) => (km ? kh : en);
  const now = new Date().getFullYear();
  const birthYears = useMemo(() => Array.from({ length: 56 }, (_, i) => now - 15 - i), [now]);
  const startYears = useMemo(() => [now, now + 1], [now]);
  const current = jobs.find((j) => j.id === job);
  const phoneOk = /^[+\d][\d\s-]{5,25}$/.test(phone.trim()) && phone.replace(/\D/g, "").length >= 8;
  const ready = name.trim().length >= 2 && phoneOk && Boolean(cv?.path) && !cv?.busy && agree && birth !== "partial" && start !== "partial";
  const steps = [name.trim().length >= 2, phoneOk, Boolean(cv?.path), agree];
  const done = steps.filter(Boolean).length;

  const upload = async (f: File) => {
    setCv({ name: f.name, size: f.size, busy: true });
    const slot = await cvUploadSlot(f.name, f.size, f.type).catch(() => ({ error: "upload" }) as { error: string; path?: string; token?: string });
    if (!slot.path || !slot.token) return setCv({ name: f.name, size: f.size, busy: false, err: slot.error ?? "upload" });
    const { error } = await createClient().storage.from("hr-files").uploadToSignedUrl(slot.path, slot.token, f, { contentType: f.type });
    setCv(error ? { name: f.name, size: f.size, busy: false, err: "upload" } : { name: f.name, size: f.size, path: slot.path, busy: false });
  };

  const field = "w-full rounded-2xl border border-black/10 bg-cream/40 px-4 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";
  const label = "mb-1.5 block text-sm font-bold text-forest";
  const errKey = state.error?.startsWith("invalid:") ? state.error.slice(8) : state.error;
  const err = errKey ? ERR[errKey]?.[km ? 1 : 0] ?? ERR.invalid[km ? 1 : 0] : "";

  return (
    <form action={action} className="mt-4 space-y-4" noValidate={false}>
      <input type="hidden" name="job" value={job} />
      <input type="hidden" name="cv_path" value={cv?.path ?? ""} />
      <input type="hidden" name="cv_name" value={cv?.name ?? ""} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="languages" value={[...langs, otherLang.trim()].filter(Boolean).join(", ")} />
      {/* robots fill every field; people never see this one */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {/* the job: chosen from the page they came from, can still be changed */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-forest p-5 text-white shadow-lift">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{L("You are applying for", "អ្នកកំពុងដាក់ពាក្យសម្រាប់ការងារ")}</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15"><Briefcase size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-extrabold leading-tight">{current ? (km && current.title_km) || current.title : "—"}</p>
            {current && (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/80">
                {current.department && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {current.department}</span>}
                <span className="inline-flex items-center gap-1"><Clock size={13} /> {JOB_TYPE[current.job_type]?.[km ? 1 : 0] ?? current.job_type}</span>
                {current.salary && <span className="inline-flex items-center gap-1 font-bold text-white"><Wallet size={13} /> {current.salary}</span>}
              </p>
            )}
          </div>
        </div>
        {jobs.length > 1 && (
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-bold text-white/70">{L("Change job", "ប្តូរការងារ")}</span>
            <div className="relative">
              <select value={job} onChange={(e) => setJob(e.target.value)} className="w-full appearance-none rounded-2xl bg-white/15 px-4 py-2.5 pr-9 font-bold text-white outline-none ring-1 ring-white/25 focus:ring-white/60">
                {jobs.map((j) => <option key={j.id} value={j.id} className="text-ink">{(km && j.title_km) || j.title}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </label>
        )}
      </div>

      {/* progress */}
      <div className="flex items-center gap-3 px-1">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        <span className="text-xs font-bold text-ink/50">{done}/{steps.length} {L("required", "ចាំបាច់")}</span>
      </div>

      <Section km={km} n={1} icon={UserRound} title={L("About you", "ព័ត៌មានផ្ទាល់ខ្លួន")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={label}>{L("Full name (Latin)", "ឈ្មោះពេញ (អក្សរឡាតាំង)")} <span className="text-red-500">*</span></span><input name="full_name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sok Dara" className={field} autoComplete="name" /></label>
          <label className="block"><span className={label}>{L("Name in Khmer", "ឈ្មោះជាអក្សរខ្មែរ")}</span><input name="full_name_km" maxLength={100} placeholder="សុខ ដារា" className={field} /></label>
          <div>
            <span className={label}>{L("Gender", "ភេទ")}</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {([["male", "Male", "ប្រុស"], ["female", "Female", "ស្រី"], ["other", "Other", "ផ្សេងៗ"]] as const).map(([v, en, kh]) => (
                <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(gender === v ? "" : v)} className={cn("rounded-2xl border py-3 text-sm font-bold transition", gender === v ? "border-primary bg-primary text-white shadow" : "border-black/10 bg-cream/40 text-forest hover:border-primary/40")}>
                  {L(en, kh)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>{L("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត")}</span>
            <DateParts name="birth_date" km={km} years={birthYears} field={field} onChange={setBirth} />
            {birth === "partial" && <span className="mt-1 block text-xs font-semibold text-amber-600">{ERR.birth_date[km ? 1 : 0]}</span>}
          </div>
        </div>
      </Section>

      <Section km={km} n={2} icon={Phone} title={L("How to reach you", "ទំនាក់ទំនង")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{L("Phone", "លេខទូរស័ព្ទ")} <span className="text-red-500">*</span></span>
            <input name="phone" required inputMode="tel" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} placeholder="012 345 678" className={cn(field, phoneTouched && phone && !phoneOk && "border-red-300 focus:border-red-400")} autoComplete="tel" />
            {phoneTouched && phone && !phoneOk && <span className="mt-1 block text-xs font-semibold text-red-600">{ERR.phone[km ? 1 : 0]}</span>}
          </label>
          <label className="block"><span className={label}>Email</span><input name="email" type="email" maxLength={120} placeholder="name@gmail.com" className={field} autoComplete="email" /></label>
          <label className="block sm:col-span-2"><span className={label}>{L("Address", "អាសយដ្ឋាន")}</span><input name="address" maxLength={200} placeholder={L("Village, commune, district, province", "ភូមិ ឃុំ/សង្កាត់ ស្រុក/ខណ្ឌ ខេត្ត/ក្រុង")} className={field} autoComplete="street-address" /></label>
        </div>
      </Section>

      <Section km={km} n={3} icon={GraduationCap} title={L("Studies and experience", "ការសិក្សា និងបទពិសោធន៍")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className={label}>{L("Education", "ការសិក្សា")}</span><textarea name="education" rows={2} maxLength={1000} placeholder={L("e.g. High school diploma 2022; Year 2, Agriculture, RUA", "ឧ. បញ្ចប់មធ្យមសិក្សាទុតិយភូមិ ២០២២ · ឆ្នាំទី២ កសិកម្ម")} className={field} /></label>
          <label className="block sm:col-span-2"><span className={label}>{L("Work experience", "បទពិសោធន៍ការងារ")}</span><textarea name="experience" rows={3} maxLength={2000} placeholder={L("Where you worked, what you did, how long", "កន្លែងធ្លាប់ធ្វើការ ការងារអ្វី រយៈពេលប៉ុន្មាន")} className={field} /></label>
          <div className="sm:col-span-2">
            <span className={label}>{L("Languages", "ភាសា")}</span>
            <div className="flex flex-wrap gap-2">
              {LANGS.map(([en, kh]) => {
                const on = langs.includes(en);
                return (
                  <button key={en} type="button" aria-pressed={on} onClick={() => setLangs((l) => (l.includes(en) ? l.filter((x) => x !== en) : [...l, en]))} className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition", on ? "border-primary bg-light-green text-primary" : "border-black/10 bg-cream/40 text-ink/70 hover:border-primary/40")}>
                    {on && <Check size={14} />} {L(en, kh)}
                  </button>
                );
              })}
              <input value={otherLang} onChange={(e) => setOtherLang(e.target.value)} maxLength={60} placeholder={L("Other…", "ផ្សេងទៀត…")} className="min-w-[8rem] flex-1 rounded-full border border-black/10 bg-cream/40 px-4 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <label className="block sm:col-span-2"><span className={label}>{L("Skills", "ជំនាញ")}</span><input name="skills" maxLength={500} placeholder={L("e.g. computer, driving, first aid", "ឧ. កុំព្យូទ័រ បើកបរ សង្គ្រោះបឋម")} className={field} /></label>
          <label className="block">
            <span className={label}>{L("Expected salary (per month)", "ប្រាក់ខែរំពឹងទុក (ក្នុងមួយខែ)")}</span>
            <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-ink/40">$</span><input name="expected_salary" inputMode="decimal" maxLength={60} placeholder="250" className={cn(field, "pl-8")} /></div>
          </label>
          <div>
            <span className={label}>{L("Can start from", "អាចចាប់ផ្តើមពី")}</span>
            <DateParts name="available_from" km={km} years={startYears} field={field} onChange={setStart} />
            {start === "partial" && <span className="mt-1 block text-xs font-semibold text-amber-600">{ERR.available_from[km ? 1 : 0]}</span>}
          </div>
          <label className="block sm:col-span-2"><span className={label}>{L("Why do you want to work here?", "ហេតុអ្វីចង់ធ្វើការនៅទីនេះ?")}</span><textarea name="about" rows={3} maxLength={2000} placeholder={L("A few words about you and why this job", "និយាយបន្តិចអំពីខ្លួនអ្នក និងហេតុអ្វីចង់បានការងារនេះ")} className={field} /></label>
        </div>
      </Section>

      <Section km={km} n={4} icon={FileText} title={L("Your CV", "CV របស់អ្នក")}>
        <input ref={pick} type="file" hidden accept=".pdf,.doc,.docx,image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {cv ? (
          <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1", cv.err ? "bg-red-50 ring-red-200" : cv.busy ? "bg-cream ring-black/5" : "bg-light-green ring-primary/20")}>
            <span className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl", cv.err ? "bg-red-100 text-red-600" : "bg-white text-primary")}>
              {cv.busy ? <Loader2 size={20} className="animate-spin" /> : cv.err ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-forest">{cv.name}</span>
              <span className={cn("block text-xs", cv.err ? "text-red-600" : "text-ink/50")}>
                {cv.err ? ERR[cv.err]?.[km ? 1 : 0] : cv.busy ? L("Uploading…", "កំពុងបញ្ចូល…") : `${(cv.size / 1024 / 1024).toFixed(cv.size > 1048576 ? 1 : 2)} MB · ${L("ready", "រួចរាល់")}`}
              </span>
            </span>
            {!cv.busy && (cv.err ? (
              <button type="button" onClick={() => pick.current?.click()} className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-forest ring-1 ring-black/10">{L("Choose again", "ជ្រើសម្តងទៀត")}</button>
            ) : (
              <button type="button" onClick={() => setCv(null)} aria-label={L("Remove", "ដកចេញ")} className="rounded-full p-1.5 text-ink/40 hover:bg-white hover:text-red-600"><X size={18} /></button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => pick.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
            className={cn("flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition", drag ? "border-primary bg-light-green" : "border-primary/30 bg-cream/40 hover:border-primary hover:bg-light-green/50")}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-soft"><FileUp size={26} /></span>
            <span className="mt-1 font-bold text-forest">{L("Choose your CV", "ជ្រើសរើស CV របស់អ្នក")} <span className="text-red-500">*</span></span>
            <span className="text-xs text-ink/50">{L("or drag it here", "ឬអូសឯកសារមកដាក់ទីនេះ")} · PDF · Word · {L("photo", "រូបថត")} · {L("10 MB at most", "អតិបរមា 10 MB")}</span>
          </button>
        )}
      </Section>

      <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-sm ring-1 transition", agree ? "bg-light-green text-forest ring-primary/20" : "bg-cream/60 text-ink/75 ring-black/5")}>
        <input type="checkbox" name="consent" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#176B3A]" />
        <span>{L("I agree that Green Wild Zoo keeps my details and CV to review my application.", "ខ្ញុំយល់ព្រមឲ្យ Green Wild Zoo រក្សាទុកព័ត៌មាន និង CV របស់ខ្ញុំ ដើម្បីពិនិត្យពាក្យសុំ។")}</span>
      </label>
      {err && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><AlertCircle size={18} /> {err}</p>}
      <Submit km={km} disabled={!ready} />
      {!ready && <p className="text-center text-xs text-ink/45">{L("Fill in the fields marked * and add your CV to send.", "សូមបំពេញកន្លែងមានសញ្ញា * និងភ្ជាប់ CV ដើម្បីផ្ញើ។")}</p>}
    </form>
  );
}
