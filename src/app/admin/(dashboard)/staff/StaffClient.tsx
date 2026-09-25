"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, Check, Copy, KeyRound, Loader2, Printer, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createStaff, resetStaffPassword, type CreateStaffState, type ResetState } from "./actions";

type Pos = { id: string; name: string; name_km: string | null; pay_type: string; rate: number };

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full px-5 py-3 text-sm sm:w-auto">
      {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {pending ? busy : label}
    </button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => {
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      })}
      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
    >
      {ok ? <Check size={13} /> : <Copy size={13} />} {label}
    </button>
  );
}

/** Round photo for the ID card: tap to choose (the phone camera works too). Sent as "photo_file". */
function PhotoPicker({ km }: { km: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#DBEAFE] to-[#EEF2FF] border-2 border-dashed border-[#2563EB]/30 transition hover:border-[#2563EB]"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[#2563EB]">
            <Camera size={28} />
            <span className="text-[11px] font-bold">{km ? "រូបថត" : "Photo"}</span>
          </span>
        )}
        {src && <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{km ? "ប្តូរ" : "Change"}</span>}
      </button>
      <input
        ref={ref}
        type="file"
        name="photo_file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setSrc(file ? URL.createObjectURL(file) : null);
        }}
      />
      {src ? (
        <button
          type="button"
          onClick={() => {
            if (ref.current) ref.current.value = "";
            setSrc(null);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-ink/45 hover:text-red-600"
        >
          <X size={12} /> {km ? "ដករូបចេញ" : "Remove"}
        </button>
      ) : (
        <span className="max-w-[8rem] text-center text-[11px] leading-tight text-ink/45">{km ? "សម្រាប់កាតសម្គាល់ខ្លួន" : "For the ID card"}</span>
      )}
    </div>
  );
}

/** Admin: add a staff member. Shows the Staff ID + password once, right after. */
export function AddStaffForm({ positions, km, today }: { positions: Pos[]; km: boolean; today: string }) {
  const [state, action] = useFormState<CreateStaffState, FormData>(createStaff, { ok: false });
  const [key, setKey] = useState(0);
  const L = km
    ? { title: "បន្ថែមបុគ្គលិកថ្មី", name: "ឈ្មោះពេញ", nameKm: "ឈ្មោះជាខ្មែរ", pos: "តួនាទី", phone: "លេខទូរស័ព្ទ", hired: "ថ្ងៃចូលធ្វើការ", allowance: "ប្រាក់ឧបត្ថម្ភ/ខែ ($)", photo: "រូបថត (សម្រាប់កាត)", add: "បង្កើតបុគ្គលិក និងកាត", busy: "កំពុងបង្កើត…", made: "បានបង្កើតរួច!", tell: "ប្រាប់បុគ្គលិកនូវលេខសម្គាល់ និងពាក្យសម្ងាត់ខាងក្រោម។ ពាក្យសម្ងាត់បង្ហាញតែម្តងនេះប៉ុណ្ណោះ។", id: "លេខសម្គាល់បុគ្គលិក", pw: "ពាក្យសម្ងាត់", copy: "ចម្លង", print: "បោះពុម្ពកាត", another: "បន្ថែមម្នាក់ទៀត", login: "ចូលប្រើនៅ /staff/login" }
    : { title: "Add a staff member", name: "Full name", nameKm: "Name in Khmer", pos: "Position", phone: "Phone", hired: "Start date", allowance: "Allowance / month ($)", photo: "Photo (for the ID card)", add: "Create staff + ID card", busy: "Creating…", made: "Created!", tell: "Give the staff member this Staff ID and password. The password is shown only this once.", id: "Staff ID", pw: "Password", copy: "Copy", print: "Print ID card", another: "Add another", login: "They sign in at /staff/login" };

  if (state.ok) {
    return (
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-6 text-white shadow-lift">
        <p className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Check size={22} className="text-leaf" /> {L.made} {state.name}
        </p>
        <p className="mt-1 text-sm text-white/80">{L.tell}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            [L.id, state.staffNo],
            [L.pw, state.password],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{k}</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide">{v}</p>
              <div className="mt-2">
                <CopyButton text={v} label={L.copy} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/70">{L.login}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/admin/card/${state.userId}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#1E3A8A]">
            <Printer size={16} /> {L.print}
          </Link>
          <button type="button" onClick={() => location.reload()} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/25">
            {L.another}
          </button>
        </div>
      </div>
    );
  }

  const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-primary";
  return (
    <form key={key} action={action} className="card space-y-4 p-5" onReset={() => setKey((k) => k + 1)}>
      <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
        <UserPlus size={20} className="text-primary" /> {L.title}
      </p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <PhotoPicker km={km} />
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.name} *</span>
            <input name="full_name" required className={field} placeholder="Sok Dara" autoComplete="off" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.nameKm}</span>
            <input name="full_name_km" className={field} placeholder="សុខ ដារា" autoComplete="off" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.pos} *</span>
            <select name="position_id" required className={field} defaultValue={positions[1]?.id ?? positions[0]?.id}>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {(km && p.name_km) || p.name} · ${p.rate} / {p.pay_type === "monthly" ? (km ? "ខែ" : "month") : p.pay_type === "daily" ? (km ? "ថ្ងៃ" : "day") : km ? "ម៉ោង" : "hour"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{km ? "លេខសម្គាល់បុគ្គលិក" : "Staff ID"}</span>
            <input name="staff_no" className={cn(field, "font-mono uppercase")} placeholder={km ? "ទុកទទេ = ស្វ័យប្រវត្តិ" : "Blank = automatic"} autoComplete="off" spellCheck={false} pattern="[A-Za-z0-9][A-Za-z0-9\-]{2,19}" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.phone}</span>
            <input name="phone" inputMode="tel" className={field} placeholder="012 345 678" autoComplete="off" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.hired}</span>
            <input name="hired_on" type="date" defaultValue={today} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.allowance}</span>
            <input name="allowance" type="number" min="0" step="0.5" defaultValue="0" className={field} />
          </label>
        </div>
      </div>
      {!state.ok && state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{state.error}</p>}
      <div className="flex justify-end border-t border-black/5 pt-4">
        <Submit label={L.add} busy={L.busy} />
      </div>
    </form>
  );
}

/** New password for a staff member who forgot theirs; shown once. */
export function ResetPassword({ userId, km }: { userId: string; km: boolean }) {
  const [state, action] = useFormState<ResetState>(resetStaffPassword.bind(null, userId), {});
  if (state.password)
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 font-mono text-sm font-bold text-amber-800 ring-1 ring-amber-200">
        <KeyRound size={14} /> {state.password}
      </span>
    );
  return (
    <form action={action}>
      <ResetBtn km={km} />
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
function ResetBtn({ km }: { km: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink/70 ring-1 ring-black/10 hover:text-primary">
      {pending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} {km ? "ពាក្យសម្ងាត់ថ្មី" : "New password"}
    </button>
  );
}
