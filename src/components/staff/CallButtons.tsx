"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, Loader2 , MessageCircle } from "lucide-react";
import { startCall } from "@/app/staff/(protected)/actions";

/** Voice / video call buttons at the top of a chat room (like Messenger). */
export function CallButtons({ channel, km }: { channel: string; km: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "voice" | "video">("");
  const call = async (video: boolean) => {
    setBusy(video ? "video" : "voice");
    const r = await startCall(channel, video).catch(() => ({ id: undefined, error: "x" }));
    if (r.id) router.push(`/staff/call/${r.id}?start=${video ? "video" : "voice"}`);
    else {
      setBusy("");
      alert(km ? "មិនអាចហៅបានទេ សូមសាកម្តងទៀត" : "Could not start the call");
    }
  };
  const btn = "flex h-10 w-10 items-center justify-center rounded-full text-[#1D4ED8] transition hover:bg-[#EEF2FF] active:scale-90 disabled:opacity-50";
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => call(false)} disabled={!!busy} className={btn} aria-label={km ? "ហៅជាសំឡេង" : "Voice call"} title={km ? "ហៅជាសំឡេង" : "Voice call"}>
        {busy === "voice" ? <Loader2 size={20} className="animate-spin" /> : <Phone size={20} />}
      </button>
      <button type="button" onClick={() => call(true)} disabled={!!busy} className={btn} aria-label={km ? "ហៅជាវីដេអូ" : "Video call"} title={km ? "ហៅជាវីដេអូ" : "Video call"}>
        {busy === "video" ? <Loader2 size={20} className="animate-spin" /> : <Video size={22} />}
      </button>
    </div>
  );
}

type Mate = { id: string; name: string; avatar: string | null; role: string; online: boolean };

/** "Call someone": the whole team, online people first, with voice / video buttons. */
export function CallPerson({ people, km, me }: { people: Mate[]; km: boolean; me?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const call = async (to: string, video: boolean) => {
    setBusy(to + video);
    const r = await startCall("all", video, to).catch(() => ({ id: undefined }));
    if (r.id) router.push(`/staff/call/${r.id}?start=${video ? "video" : "voice"}`);
    else setBusy("");
  };
  const list = people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-2 text-xs font-extrabold text-[#1D4ED8] transition hover:bg-[#DBEAFE] active:scale-95">
        <Phone size={14} /> {km ? "ហៅ / ផ្ញើសារ" : "Call / message"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 md:items-center" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lift md:rounded-3xl">
            <h3 className="font-display text-lg font-extrabold text-forest">{km ? "ហៅ ឬផ្ញើសារផ្ទាល់ទៅនរណា?" : "Call or message someone"}</h3>
            <p className="mt-0.5 text-xs text-ink/50">{km ? "សារផ្ទាល់ · មានតែអ្នកទាំងពីរប៉ុណ្ណោះឃើញ" : "Private messages · only you two can see them"}</p>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={km ? "ស្វែងរកឈ្មោះ…" : "Search a name…"} className="mt-3 w-full rounded-2xl border border-black/10 bg-[#F8FAFF] px-4 py-2.5 text-base outline-none focus:border-[#2563EB]" />
            <ul className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50">
                  <span className="relative h-10 w-10 flex-shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-extrabold text-[#1D4ED8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...p.name][0]}
                    </span>
                    {p.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-forest">{p.name}</span>
                    <span className="block truncate text-xs text-ink/45">{p.online ? (km ? "កំពុងប្រើ" : "online") : p.role}</span>
                  </span>
                  {me && (
                    <button type="button" onClick={() => { setOpen(false); router.push(`/staff/chat?c=dm:${[me, p.id].sort().join(":")}`); }} aria-label={km ? `ផ្ញើសារទៅ ${p.name}` : `Message ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                      <MessageCircle size={18} />
                    </button>
                  )}
                  <button type="button" disabled={!!busy} onClick={() => call(p.id, false)} aria-label={km ? `ហៅ ${p.name}` : `Call ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50">
                    {busy === p.id + "false" ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => call(p.id, true)} aria-label={km ? `ហៅវីដេអូ ${p.name}` : `Video call ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1D4ED8] hover:bg-[#DBEAFE] disabled:opacity-50">
                    {busy === p.id + "true" ? <Loader2 size={18} className="animate-spin" /> : <Video size={19} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
