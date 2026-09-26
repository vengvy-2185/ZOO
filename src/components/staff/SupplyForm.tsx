"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send, Minus, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { SUPPLY_SECTIONS, type Section } from "@/lib/staff-extras";
import { requestSupply, type SupplyState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-[#1E40AF] active:scale-[.98] disabled:opacity-60">
      <Send size={16} /> {pending ? busy : label}
    </button>
  );
}

export function SupplyForm({ km, sections, picks }: { km: boolean; sections: Section[]; picks?: Partial<Record<Section, [string, string][]>> }) {
  const [state, action] = useFormState<SupplyState, FormData>(requestSupply, {});
  const [section, setSection] = useState<Section>(sections[0]);
  const [item, setItem] = useState("");
  const [qty, setQty] = useState(1);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setItem("");
      setQty(1);
    }
  }, [state]);
  const S = SUPPLY_SECTIONS[section];
  const L = km
    ? { section: "ផ្នែក", pick: "ជ្រើសរហ័ស", item: "របស់ដែលត្រូវការ", itemPh: "ឧ. ក្រដាសបោះពុម្ព", qty: "ចំនួន", urgent: "បន្ទាន់", note: "កំណត់ចំណាំ (ស្រេចចិត្ត)", send: "ផ្ញើសំណើ", busy: "កំពុងផ្ញើ…", done: "បានផ្ញើហើយ! អ្នកគ្រប់គ្រងនឹងពិនិត្យ។", invalid: "សូមបំពេញរបស់ និងចំនួនឲ្យត្រឹមត្រូវ។" }
    : { section: "Section", pick: "Quick pick", item: "What do you need?", itemPh: "e.g. Receipt paper rolls", qty: "Quantity", urgent: "Urgent", note: "Note (optional)", send: "Send request", busy: "Sending…", done: "Sent! A manager will look at it.", invalid: "Please fill in the item and quantity." };

  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink/45">{L.section}</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {sections.map((k) => {
            const X = SUPPLY_SECTIONS[k];
            const on = k === section;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSection(k);
                  setItem("");
                }}
                className={cn("inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold ring-1 transition", on ? "text-white shadow-soft ring-transparent" : "bg-white text-ink/60 ring-black/10 hover:text-ink")}
                style={on ? { background: X.color } : undefined}
              >
                <X.Icon size={15} /> {km ? X.km : X.en}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink/45">{L.pick}</p>
        <div key={section} className="flex flex-wrap gap-2">
          {(picks?.[section] ?? S.items).map(([en, kh], i) => {
            const label = km ? kh : en;
            const on = item === label;
            return (
              <button
                key={en}
                type="button"
                onClick={() => setItem(label)}
                className={cn("animate-[gwzPop_.35s_ease-out_both] rounded-2xl px-3 py-2 text-sm font-bold ring-1 transition", on ? "text-white ring-transparent" : "bg-white text-ink/70 ring-black/10 hover:-translate-y-0.5")}
                style={{ animationDelay: `${i * 50}ms`, ...(on ? { background: S.color } : {}) }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">{L.item}</span>
          <input name="item" required maxLength={80} value={item} onChange={(e) => setItem(e.target.value)} placeholder={L.itemPh} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-[#2563EB]" />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">{L.qty}</span>
          <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]" aria-label="-"><Minus size={16} /></button>
            <input name="quantity" type="number" min={1} max={9999} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))} className="w-16 bg-transparent text-center font-display text-lg font-extrabold text-forest outline-none" />
            <button type="button" onClick={() => setQty((q) => Math.min(9999, q + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]" aria-label="+"><Plus size={16} /></button>
          </div>
        </div>
      </div>
      <input name="note" maxLength={300} placeholder={L.note} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-[#2563EB]" />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-red-50 px-3.5 py-2 text-sm font-bold text-red-600 ring-1 ring-red-100">
        <input type="checkbox" name="urgent" className="h-4 w-4 accent-red-600" /> <AlertTriangle size={15} /> {L.urgent}
      </label>
      {state.ok && <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={16} /> {L.done}</p>}
      {state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{state.error === "invalid" ? L.invalid : state.error}</p>}
      <Submit label={L.send} busy={L.busy} />
    </form>
  );
}
