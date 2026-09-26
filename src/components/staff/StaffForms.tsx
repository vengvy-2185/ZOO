"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, LogOut, Save, Send, ShieldCheck } from "lucide-react";
import { changeMyPassword, reportIssue, requestLeave, updateMyProfile, type IssueState, type LeaveState, type PasswordState, type ProfileState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50";

function Submit({ text, busy, icon: Icon }: { text: string; busy: string; icon: typeof Save }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-[#1E40AF] disabled:opacity-70 sm:w-auto">
      {pending ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />} {pending ? busy : text}
    </button>
  );
}
function Done({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 size={17} /> {text}
    </p>
  );
}
function Err({ text }: { text: string }) {
  return <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{text}</p>;
}

// ── Leave request ─────────────────────────────────────────────────────
export function LeaveForm({ km, today, disabled = false }: { km: boolean; today: string; disabled?: boolean }) {
  const [state, action] = useFormState<LeaveState, FormData>(requestLeave, {});
  const ref = useRef<HTMLFormElement>(null);
  const [start, setStart] = useState(today);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const L = km
    ? { kind: "ប្រភេទច្បាប់", kinds: { annual: "ច្បាប់ប្រចាំឆ្នាំ", sick: "ឈឺ", personal: "កិច្ចការផ្ទាល់ខ្លួន", other: "ផ្សេងៗ" }, from: "ចាប់ពីថ្ងៃ", to: "ដល់ថ្ងៃ", reason: "មូលហេតុ", send: "ផ្ញើសំណើ", busy: "កំពុងផ្ញើ…", done: "បានផ្ញើសំណើហើយ។ អ្នកគ្រប់គ្រងនឹងពិនិត្យ។", invalid: "សូមពិនិត្យថ្ងៃ និងមូលហេតុ។", quota: "អ្នកបានប្រើច្បាប់អស់ចំនួនដងសម្រាប់ឆ្នាំនេះហើយ។ សូមទាក់ទងអ្នកគ្រប់គ្រង។" }
    : { kind: "Type", kinds: { annual: "Annual leave", sick: "Sick", personal: "Personal", other: "Other" }, from: "From", to: "To", reason: "Reason", send: "Send request", busy: "Sending…", done: "Request sent. An admin will review it.", invalid: "Please check the dates and reason.", quota: "You have used all your leave requests for this year. Please talk to an admin." };
  return (
    <form ref={ref} action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-50">
      <fieldset>
        <legend className={label}>{L.kind}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(L.kinds) as (keyof typeof L.kinds)[]).map((k, i) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex items-center justify-center rounded-2xl bg-white px-3 py-2.5 text-center text-sm font-bold text-ink/60 ring-1 ring-black/10 transition peer-checked:bg-[#1D4ED8] peer-checked:text-white peer-checked:ring-0">
                {L.kinds[k]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>{L.from}</span>
          <input name="start_date" type="date" required min={today} value={start} onChange={(e) => setStart(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className={label}>{L.to}</span>
          <input name="end_date" type="date" required min={start} defaultValue={today} className={field} />
        </label>
      </div>
      <label className="block">
        <span className={label}>{L.reason}</span>
        <textarea name="reason" required maxLength={400} rows={3} className={cn(field, "resize-none")} />
      </label>
      </fieldset>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={state.error === "invalid" ? L.invalid : state.error === "quota" ? L.quota : state.error} />}
      <div className="flex justify-end">
        {!disabled && <Submit text={L.send} busy={L.busy} icon={Send} />}
      </div>
    </form>
  );
}

// ── Profile (photo + phone) ───────────────────────────────────────────
export function ProfileForm({ km, photo, phone, name }: { km: boolean; photo: string | null; phone: string | null; name: string }) {
  const [state, action] = useFormState<ProfileState, FormData>(updateMyProfile, {});
  const [preview, setPreview] = useState<string | null>(photo);
  const fileRef = useRef<HTMLInputElement>(null);
  const L = km
    ? { photo: "ប្តូររូបថត", phone: "លេខទូរស័ព្ទ", save: "រក្សាទុក", busy: "កំពុងរក្សាទុក…", done: "បានរក្សាទុក។ កាតសម្គាល់ខ្លួនប្រើរូបថ្មីហើយ។", errors: { phone: "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។", type: "សូមជ្រើសរូប JPG, PNG ឬ WebP។", size: "រូបធំជាង 5 MB។" } as Record<string, string>, hint: "រូបការ៉េ មុខច្បាស់ មើលទៅល្អបំផុតលើកាត។" }
    : { photo: "Change photo", phone: "Phone", save: "Save", busy: "Saving…", done: "Saved. Your ID card uses the new photo.", errors: { phone: "That phone number doesn't look right.", type: "Please choose a JPG, PNG or WebP image.", size: "The photo is larger than 5 MB." } as Record<string, string>, hint: "A square photo with a clear face looks best on the card." };
  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#DBEAFE] to-[#EEF2FF] ring-4 ring-white shadow-soft">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-4xl font-extrabold text-[#1D4ED8]">{[...name][0]?.toUpperCase()}</span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/50 py-1 text-white">
            <Camera size={14} />
          </span>
        </button>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-4 py-2 text-sm font-bold text-[#1D4ED8] hover:bg-[#E0E7FF]">
            <Camera size={15} /> {L.photo}
          </button>
          <p className="mt-1.5 text-xs text-ink/50">{L.hint}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="photo_file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
        />
      </div>
      <label className="block">
        <span className={label}>{L.phone}</span>
        <input name="phone" inputMode="tel" defaultValue={phone ?? ""} placeholder="012 345 678" className={field} />
      </label>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={L.errors[state.error] ?? state.error} />}
      <div className="flex justify-end">
        <Submit text={L.save} busy={L.busy} icon={Save} />
      </div>
    </form>
  );
}

// ── Change password ───────────────────────────────────────────────────
function PasswordInput({ name, placeholder, auto, onValue }: { name: string; placeholder: string; auto: string; onValue?: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <KeyRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D4ED8]" />
      <input name={name} type={show ? "text" : "password"} required autoComplete={auto} placeholder={placeholder} onChange={(e) => onValue?.(e.target.value)} className={cn(field, "pl-11 pr-11")} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/40 hover:text-ink" aria-label={show ? "hide" : "show"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function PasswordForm({ km }: { km: boolean }) {
  const [state, action] = useFormState<PasswordState, FormData>(changeMyPassword, {});
  const [pw, setPw] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setPw("");
    }
  }, [state]);
  const checks = [
    { ok: pw.length >= 8, en: "8+ characters", km: "យ៉ាងតិច 8 តួ" },
    { ok: /[A-Za-z]/.test(pw), en: "a letter", km: "មានអក្សរ" },
    { ok: /\d/.test(pw), en: "a number", km: "មានលេខ" },
  ];
  const L = km
    ? { current: "ពាក្យសម្ងាត់បច្ចុប្បន្ន", next: "ពាក្យសម្ងាត់ថ្មី", confirm: "វាយពាក្យសម្ងាត់ថ្មីម្តងទៀត", save: "ប្តូរពាក្យសម្ងាត់", busy: "កំពុងប្តូរ…", done: "បានប្តូរពាក្យសម្ងាត់ហើយ។ ប្រើពាក្យថ្មីពេលចូលលើកក្រោយ។", errors: { current: "ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ។", weak: "ពាក្យសម្ងាត់ថ្មីខ្សោយពេក។", match: "ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នា។", same: "ពាក្យសម្ងាត់ថ្មីដូចពាក្យចាស់។", busy: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំមួយនាទី។", other: "មិនអាចប្តូរបានទេ។ សូមព្យាយាមម្តងទៀត។" } }
    : { current: "Current password", next: "New password", confirm: "Type the new password again", save: "Change password", busy: "Changing…", done: "Password changed. Use the new one next time you sign in.", errors: { current: "Your current password is wrong.", weak: "The new password is too weak.", match: "The two new passwords don't match.", same: "The new password is the same as the old one.", busy: "Too many tries. Wait a minute.", other: "Couldn't change it. Please try again." } };
  return (
    <form ref={ref} action={action} className="space-y-3">
      <PasswordInput name="current" placeholder={L.current} auto="current-password" />
      <PasswordInput name="next" placeholder={L.next} auto="new-password" onValue={setPw} />
      <div className="flex flex-wrap gap-1.5">
        {checks.map((c) => (
          <span key={c.en} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", c.ok ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-ink/45")}>
            {c.ok ? <CheckCircle2 size={12} /> : <span className="h-3 w-3 rounded-full border border-current" />} {km ? c.km : c.en}
          </span>
        ))}
      </div>
      <PasswordInput name="confirm" placeholder={L.confirm} auto="new-password" />
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={L.errors[state.error]} />}
      <div className="flex justify-end">
        <Submit text={L.save} busy={L.busy} icon={ShieldCheck} />
      </div>
    </form>
  );
}

// ── Clock in / out button ─────────────────────────────────────────────
export function ClockButton({ onShift, label }: { onShift: boolean; label: string }) {
  const { pending } = useFormStatus();
  const Icon = onShift ? LogOut : LogIn;
  return (
    <button
      disabled={pending}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-extrabold text-white shadow-lift transition active:scale-[0.98] disabled:opacity-70",
        onShift ? "bg-[#E1232E] hover:bg-[#C81E28]" : "bg-[#1D4ED8] hover:bg-[#1E40AF]"
      )}
    >
      {pending ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />} {label}
    </button>
  );
}

// ── Report a problem ──────────────────────────────────────────────────
export function IssueForm({ km, defaultCategory = "repair" }: { km: boolean; defaultCategory?: string }) {
  const [state, action] = useFormState<IssueState, FormData>(reportIssue, {});
  const ref = useRef<HTMLFormElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setPhoto(null);
    }
  }, [state]);
  const CATS = km
    ? { repair: "ជួសជុល", cleaning: "សម្អាត", animal: "សត្វ", safety: "សុវត្ថិភាព", visitor: "ភ្ញៀវ", other: "ផ្សេងៗ" }
    : { repair: "Repair", cleaning: "Cleaning", animal: "Animal", safety: "Safety", visitor: "Visitor", other: "Other" };
  const L = km
    ? { cat: "ប្រភេទបញ្ហា", place: "កន្លែង", placeHint: "ឧ. បង្គន់តំបន់ B, ទ្រុងសិង្ហ", note: "ពិពណ៌នា", urgent: "បន្ទាន់", photo: "ថតរូប (ស្រេចចិត្ត)", send: "រាយការណ៍", busy: "កំពុងផ្ញើ…", done: "បានរាយការណ៍ហើយ។ អ្នកគ្រប់គ្រងនឹងដោះស្រាយ។", invalid: "សូមបំពេញកន្លែង និងការពិពណ៌នា។" }
    : { cat: "Type of problem", place: "Where", placeHint: "e.g. Zone B toilets, lion enclosure", note: "What's wrong", urgent: "Urgent", photo: "Photo (optional)", send: "Report", busy: "Sending…", done: "Reported. A manager will take care of it.", invalid: "Please fill in where and what's wrong." };
  return (
    <form ref={ref} action={action} className="space-y-4">
      <fieldset>
        <legend className={label}>{L.cat}</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CATS) as (keyof typeof CATS)[]).map((k) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="category" value={k} defaultChecked={k === defaultCategory} className="peer sr-only" />
              <span className="flex items-center justify-center rounded-2xl bg-white px-2 py-2.5 text-center text-sm font-bold text-ink/60 ring-1 ring-black/10 transition peer-checked:bg-[#1D4ED8] peer-checked:text-white peer-checked:ring-0">{CATS[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className={label}>{L.place}</span>
        <input name="place" required maxLength={120} placeholder={L.placeHint} className={field} />
      </label>
      <label className="block">
        <span className={label}>{L.note}</span>
        <textarea name="note" required maxLength={600} rows={3} className={cn(field, "resize-none")} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-[#1E3A8A] ring-1 ring-black/10">
          <Camera size={16} /> {L.photo}
          <input type="file" name="photo_file" accept="image/png,image/jpeg,image/webp" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); }} />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/10" />}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-red-600">
          <input type="checkbox" name="urgent" className="h-4 w-4 accent-red-600" /> {L.urgent}
        </label>
      </div>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={state.error === "invalid" ? L.invalid : state.error} />}
      <div className="flex justify-end">
        <Submit text={L.send} busy={L.busy} icon={Send} />
      </div>
    </form>
  );
}
