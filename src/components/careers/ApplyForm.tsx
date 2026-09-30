"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { FileUp, Loader2, CheckCircle2, AlertCircle, Send, X } from "lucide-react";
import { applyForJob, cvUploadSlot, type ApplyState } from "@/app/careers/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

function Submit({ km, disabled }: { km: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-white shadow-lift transition active:scale-[.98] disabled:opacity-60">
      {pending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} {km ? "ផ្ញើពាក្យសុំ" : "Send my application"}
    </button>
  );
}

const ERR: Record<string, [string, string]> = {
  invalid: ["Please check the form (name, phone…).", "សូមពិនិត្យព័ត៌មាន (ឈ្មោះ លេខទូរស័ព្ទ…)"],
  cv: ["Please add your CV.", "សូមភ្ជាប់ CV របស់អ្នក"],
  consent: ["Please tick the box to agree.", "សូមធីកយល់ព្រម"],
  closed: ["This job is closed.", "ការងារនេះបិទទទួលពាក្យហើយ"],
  limit: ["Too many tries — please wait a while.", "ព្យាយាមច្រើនពេក សូមរង់ចាំបន្តិច"],
  type: ["The CV must be PDF, Word or a photo.", "CV ត្រូវជា PDF, Word ឬរូបថត"],
  size: ["The CV is too big (10 MB at most).", "CV ធំពេក (អតិបរមា 10 MB)"],
  upload: ["The CV could not be uploaded, try again.", "បញ្ចូល CV មិនបាន សូមសាកម្តងទៀត"],
};

/** The application form: personal details, experience, and the CV (PDF / Word / photo). */
export function ApplyForm({ jobId, km }: { jobId: string; km: boolean }) {
  const router = useRouter();
  const [state, action] = useFormState<ApplyState, FormData>(applyForJob, {});
  const [cv, setCv] = useState<{ name: string; path?: string; busy: boolean; err?: string } | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.token) router.push(`/careers/done/${state.token}`);
  }, [state.token, router]);

  const upload = async (f: File) => {
    setCv({ name: f.name, busy: true });
    const slot = await cvUploadSlot(f.name, f.size, f.type).catch(() => ({ error: "upload" }) as { error: string; path?: string; token?: string });
    if (!slot.path || !slot.token) return setCv({ name: f.name, busy: false, err: slot.error ?? "upload" });
    const { error } = await createClient().storage.from("hr-files").uploadToSignedUrl(slot.path, slot.token, f, { contentType: f.type });
    setCv(error ? { name: f.name, busy: false, err: "upload" } : { name: f.name, path: slot.path, busy: false });
  };

  const L = (en: string, kh: string) => (km ? kh : en);
  const field = "w-full rounded-2xl border border-black/10 bg-cream/40 px-4 py-3 text-base outline-none transition focus:border-primary focus:bg-white";
  const label = "mb-1 block text-sm font-bold text-forest";
  const err = state.error ? ERR[state.error]?.[km ? 1 : 0] ?? state.error : "";

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="job" value={jobId} />
      <input type="hidden" name="cv_path" value={cv?.path ?? ""} />
      <input type="hidden" name="cv_name" value={cv?.name ?? ""} />
      {/* robots fill every field; people never see this one */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={label}>{L("Full name (Latin)", "ឈ្មោះពេញ (អក្សរឡាតាំង)")} *</span><input name="full_name" required minLength={2} maxLength={100} className={field} autoComplete="name" /></label>
        <label className="block"><span className={label}>{L("Name in Khmer", "ឈ្មោះជាអក្សរខ្មែរ")}</span><input name="full_name_km" maxLength={100} className={field} /></label>
        <label className="block"><span className={label}>{L("Phone", "លេខទូរស័ព្ទ")} *</span><input name="phone" required inputMode="tel" maxLength={25} placeholder="012 345 678" className={field} autoComplete="tel" /></label>
        <label className="block"><span className={label}>Email</span><input name="email" type="email" maxLength={120} className={field} autoComplete="email" /></label>
        <label className="block">
          <span className={label}>{L("Gender", "ភេទ")}</span>
          <select name="gender" className={field} defaultValue="">
            <option value="">—</option>
            <option value="male">{L("Male", "ប្រុស")}</option>
            <option value="female">{L("Female", "ស្រី")}</option>
            <option value="other">{L("Other", "ផ្សេងៗ")}</option>
          </select>
        </label>
        <label className="block"><span className={label}>{L("Date of birth", "ថ្ងៃខែឆ្នាំកំណើត")}</span><input name="birth_date" type="date" className={field} /></label>
        <label className="block sm:col-span-2"><span className={label}>{L("Address", "អាសយដ្ឋាន")}</span><input name="address" maxLength={200} className={field} /></label>
        <label className="block sm:col-span-2"><span className={label}>{L("Education", "ការសិក្សា")}</span><textarea name="education" rows={2} maxLength={1000} className={field} /></label>
        <label className="block sm:col-span-2"><span className={label}>{L("Work experience", "បទពិសោធន៍ការងារ")}</span><textarea name="experience" rows={3} maxLength={2000} className={field} /></label>
        <label className="block"><span className={label}>{L("Languages", "ភាសា")}</span><input name="languages" maxLength={200} placeholder={L("Khmer, English…", "ខ្មែរ អង់គ្លេស…")} className={field} /></label>
        <label className="block"><span className={label}>{L("Skills", "ជំនាញ")}</span><input name="skills" maxLength={500} className={field} /></label>
        <label className="block"><span className={label}>{L("Expected salary", "ប្រាក់ខែរំពឹងទុក")}</span><input name="expected_salary" maxLength={60} placeholder="$" className={field} /></label>
        <label className="block"><span className={label}>{L("Can start from", "អាចចាប់ផ្តើមពី")}</span><input name="available_from" type="date" className={field} /></label>
        <label className="block sm:col-span-2"><span className={label}>{L("Why do you want to work here?", "ហេតុអ្វីចង់ធ្វើការនៅទីនេះ?")}</span><textarea name="about" rows={3} maxLength={2000} className={field} /></label>
      </div>

      {/* CV */}
      <div>
        <span className={label}>CV *</span>
        <input ref={pick} type="file" hidden accept=".pdf,.doc,.docx,image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {cv ? (
          <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 ring-1", cv.err ? "bg-red-50 ring-red-200" : "bg-light-green ring-primary/20")}>
            {cv.busy ? <Loader2 size={20} className="animate-spin text-primary" /> : cv.err ? <AlertCircle size={20} className="text-red-600" /> : <CheckCircle2 size={20} className="text-primary" />}
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-forest">{cv.name}{cv.err && <span className="block text-xs text-red-600">{ERR[cv.err]?.[km ? 1 : 0]}</span>}</span>
            <button type="button" onClick={() => setCv(null)} aria-label="remove" className="text-ink/40 hover:text-red-600"><X size={18} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => pick.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-primary/30 bg-cream/40 px-4 py-6 text-center transition hover:border-primary">
            <FileUp size={28} className="text-primary" />
            <span className="font-bold text-forest">{L("Choose your CV", "ជ្រើសរើស CV របស់អ្នក")}</span>
            <span className="text-xs text-ink/50">PDF · Word · {L("photo", "រូបថត")} — {L("10 MB at most", "អតិបរមា 10 MB")}</span>
          </button>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-2xl bg-cream/60 p-4 text-sm text-ink/75">
        <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 accent-[#176B3A]" />
        <span>{L("I agree that Green Wild Zoo keeps my details and CV to review my application.", "ខ្ញុំយល់ព្រមឲ្យ Green Wild Zoo រក្សាទុកព័ត៌មាន និង CV របស់ខ្ញុំ ដើម្បីពិនិត្យពាក្យសុំ។")}</span>
      </label>
      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{err}</p>}
      <Submit km={km} disabled={!cv?.path || cv.busy} />
    </form>
  );
}
