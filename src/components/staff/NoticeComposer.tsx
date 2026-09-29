"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Megaphone, Send, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { postStaffNotice, type NoticeState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

function Submit({ km }: { km: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition active:scale-95 disabled:opacity-70">
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {km ? "ផ្សាយ និងផ្ញើទៅទូរស័ព្ទ" : "Post and send to phones"}
    </button>
  );
}

/** Managers / admins: write a notice for all staff (it also reaches their phones). */
export function NoticeComposer({ km }: { km: boolean }) {
  const [state, action] = useFormState<NoticeState, FormData>(postStaffNotice, {});
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  const field = "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base text-ink outline-none focus:border-[#2563EB]";
  return (
    <div className="card overflow-hidden p-0 ring-2 ring-[#BFDBFE]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white"><Megaphone size={19} /></span>
        <span className="flex-1">
          <span className="block font-display font-extrabold text-forest">{km ? "សរសេរសេចក្តីជូនដំណឹង" : "Write a notice"}</span>
          <span className="block text-xs text-ink/55">{km ? "បុគ្គលិកទាំងអស់ឃើញនៅទីនេះ ហើយទទួលលើទូរស័ព្ទ" : "All staff see it here and get it on their phones"}</span>
        </span>
        <ChevronDown size={18} className={cn("text-ink/40 transition", open && "rotate-180")} />
      </button>
      {open && (
        <form ref={form} action={action} className="space-y-2.5 border-t border-black/5 p-4">
          <input name="title" required maxLength={120} placeholder={km ? "ចំណងជើង ឧ. ប្រជុំបុគ្គលិក ថ្ងៃសៅរ៍" : "Title, e.g. Staff meeting on Saturday"} className={field} />
          <textarea name="body" required rows={3} maxLength={2000} placeholder={km ? "ខ្លឹមសារ…" : "Message…"} className={field} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink/70">
              <input type="checkbox" name="pinned" className="h-4 w-4 accent-[#1D4ED8]" /> {km ? "ខ្ទាស់នៅខាងលើ" : "Pin to the top"}
            </label>
            <Submit km={km} />
          </div>
          {state.ok && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> {km ? "បានផ្សាយ ហើយផ្ញើទៅទូរស័ព្ទបុគ្គលិកហើយ" : "Posted and sent to staff phones"}</p>}
          {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{state.error === "invalid" ? (km ? "សូមសរសេរចំណងជើង និងខ្លឹមសារ" : "Write a title and a message") : state.error}</p>}
        </form>
      )}
    </div>
  );
}
