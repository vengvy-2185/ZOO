"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Heart, Search, Send, CheckCircle2 } from "lucide-react";
import { BADGES, type Badge } from "@/lib/staff-extras";
import { sendKudos, type KudosState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

export type Colleague = { id: string; name: string; avatar: string | null; position: string };

function Submit({ label, busy, disabled }: { label: string; busy: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] px-5 py-3 text-sm font-bold text-white shadow-soft transition active:scale-[.98] disabled:opacity-50">
      <Send size={16} /> {pending ? busy : label}
    </button>
  );
}

export function KudosForm({ km, colleagues }: { km: boolean; colleagues: Colleague[] }) {
  const [state, action] = useFormState<KudosState, FormData>(sendKudos, {});
  const [to, setTo] = useState<string>("");
  const [badge, setBadge] = useState<Badge>("helpful");
  const [q, setQ] = useState("");
  const [burst, setBurst] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setTo("");
      setBurst((b) => b + 1);
    }
  }, [state]);
  const list = useMemo(() => colleagues.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [colleagues, q]);
  const L = km
    ? { who: "អរគុណអ្នកណា?", search: "ស្វែងរកឈ្មោះ…", badge: "ផ្លាកសញ្ញា", msg: "សារខ្លី (ស្រេចចិត្ត)", msgPh: "ឧ. អរគុណដែលជួយខ្ញុំថ្ងៃនេះ!", send: "ផ្ញើពាក្យអរគុណ", busy: "កំពុងផ្ញើ…", done: "បានផ្ញើហើយ! 🎉", limit: "អ្នកផ្ញើបាន ១០ ដងក្នុងមួយថ្ងៃ។", invalid: "សូមជ្រើសមិត្តរួមការងារ។", nobody: "មិនទាន់មានមិត្តរួមការងារ។" }
    : { who: "Who do you want to thank?", search: "Search a name…", badge: "Badge", msg: "Short message (optional)", msgPh: "e.g. Thanks for helping me today!", send: "Send thanks", busy: "Sending…", done: "Sent! 🎉", limit: "You can send 10 a day.", invalid: "Please pick a colleague.", nobody: "No colleagues yet." };

  return (
    <form ref={ref} action={action} className="relative space-y-4">
      <input type="hidden" name="to_user" value={to} />
      <input type="hidden" name="badge" value={badge} />
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink/45">{L.who}</p>
        <div className="relative mb-2">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB]" />
        </div>
        <div className="no-scrollbar flex max-h-56 flex-wrap gap-2 overflow-y-auto p-0.5">
          {list.length === 0 && <p className="text-sm text-ink/50">{L.nobody}</p>}
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => setTo(c.id)} className={cn("flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-bold ring-1 transition", to === c.id ? "bg-[#1D4ED8] text-white ring-transparent shadow-soft" : "bg-white text-forest ring-black/10 hover:-translate-y-0.5")}>
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold", to === c.id ? "bg-white/20" : "bg-[#EEF2FF] text-[#1D4ED8]")}>{c.name.slice(0, 1)}</span>
              )}
              <span className="max-w-[9rem] truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink/45">{L.badge}</p>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(BADGES) as Badge[]).map((k) => {
            const B = BADGES[k];
            const on = badge === k;
            return (
              <button key={k} type="button" onClick={() => setBadge(k)} className={cn("flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition", on ? "bg-white shadow-soft ring-2 ring-[#3B82F6]" : "hover:bg-white")}>
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm transition-transform duration-300", on && "scale-110 rotate-6")} style={{ background: `linear-gradient(135deg, ${B.from}, ${B.to})` }}>
                  <B.Icon size={20} />
                </span>
                <span className="text-[10px] font-bold leading-tight text-ink/70 sm:text-[11px]">{km ? B.km : B.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">{L.msg}</span>
        <input name="message" maxLength={200} placeholder={L.msgPh} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#2563EB]" />
      </label>
      {state.ok && <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={16} /> {L.done}</p>}
      {state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{state.error === "limit" ? L.limit : state.error === "invalid" ? L.invalid : state.error}</p>}
      <Submit label={L.send} busy={L.busy} disabled={!to} />

      {/* little hearts float up after sending */}
      {burst > 0 && (
        <div key={burst} className="pointer-events-none absolute inset-x-0 bottom-10 h-0" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <Heart key={i} size={14 + (i % 3) * 5} className="gwz-float-up absolute fill-pink-400 text-pink-400" style={{ left: `${8 + i * 9}%`, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      )}
    </form>
  );
}
