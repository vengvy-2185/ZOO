"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ShieldCheck, Ticket, PawPrint, Sparkles, Map as MapIcon, Lock, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { msgText, chatTime, chatDayKey } from "@/lib/chat-text";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = { all: Users, managers: ShieldCheck, tickets: Ticket, animals: PawPrint, cleaning: Sparkles, guide: MapIcon };
type Room = { key: string; label: string; color: string; avatar?: string | null; dm?: boolean; online?: boolean };
type Last = { user_id: string | null; created_at: string; body: string | null; kind?: string | null; files?: any; audio_url?: string | null; meta?: any } | null;

/** The list of rooms: last message and unread count, kept up to date live. */
export function ChatList({ rooms, current, last, unread, me, names, km }: { rooms: Room[]; current: string; last: Record<string, Last>; unread: Record<string, number>; me: string; names: Record<string, string>; km: boolean }) {
  const [lastOf, setLastOf] = useState(last);
  const [counts, setCounts] = useState(unread);
  useEffect(() => setLastOf(last), [last]);
  useEffect(() => setCounts(unread), [unread]);
  useEffect(() => {
    const keys = new Set(rooms.map((r) => r.key));
    const sb = createClient();
    const ch = sb
      .channel(`chat-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_messages" }, (e: any) => {
        const m = e.new;
        if (!m || !keys.has(m.channel)) return;
        setLastOf((x) => ({ ...x, [m.channel]: m }));
        if (m.user_id !== me && m.channel !== current) setCounts((x) => ({ ...x, [m.channel]: (x[m.channel] ?? 0) + 1 }));
      })
      .subscribe();
    // the open room also asks the server every few seconds: use its answer too
    const onPoll = (e: Event) => {
      const x = (e as CustomEvent).detail;
      if (x?.last) setLastOf((cur) => ({ ...cur, ...x.last }));
      if (x?.unread) setCounts(Object.fromEntries(rooms.map((r) => [r.key, r.key === current ? 0 : x.unread[r.key] ?? 0])));
    };
    window.addEventListener("gwz-chat-poll", onPoll);
    return () => {
      sb.removeChannel(ch);
      window.removeEventListener("gwz-chat-poll", onPoll);
    };
  }, [rooms, current, me]);

  const when = (iso: string) => (chatDayKey(iso) === chatDayKey(new Date().toISOString()) ? chatTime(iso) : chatDayKey(iso).slice(5).replace("-", "/"));
  const preview = (r: Last) => {
    if (!r) return km ? "មិនទាន់មានសារ" : "No messages yet";
    const who = r.user_id === me ? (km ? "អ្នក" : "You") : names[r.user_id ?? ""] ?? "";
    return `${who}: ${msgText(r as any, km)}`;
  };

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
      {rooms.map((c, i) => {
        const Icon = ICONS[c.key] ?? Users;
        const on = c.key === current;
        const n = on ? 0 : counts[c.key] ?? 0;
        const l = lastOf[c.key];
        return (
          <div key={c.key}>
          {c.dm && !rooms[i - 1]?.dm && <p className="mb-1 mt-3 flex items-center gap-1.5 px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-ink/40"><Lock size={11} /> {km ? "សារផ្ទាល់" : "Private"}</p>}
          <Link href={`/staff/chat?c=${c.key}`} className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", on ? "md:bg-[#EEF2FF]" : "hover:bg-slate-50", "active:bg-[#EEF2FF]")}>
            {c.dm ? (
              <span className="relative h-12 w-12 flex-shrink-0">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#CFFAFE] text-base font-extrabold text-[#0E7490] shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.avatar ? <img src={c.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...c.label][0]?.toUpperCase()}
                </span>
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
              </span>
            ) : (
              <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={{ background: c.color }}>
                <Icon size={21} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-[15px]", n ? "font-extrabold text-forest" : "font-bold text-forest")}>{c.label}</span>
                {l && <span className={cn("flex-shrink-0 text-[11px]", n ? "font-bold text-[#1D4ED8]" : "text-ink/40")}>{when(l.created_at)}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-[13px]", n ? "font-bold text-ink/85" : "text-ink/50")}>{preview(l)}</span>
                {n > 0 && <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] px-1.5 text-[11px] font-bold text-white">{n > 99 ? "99+" : n}</span>}
              </span>
            </span>
          </Link>
          </div>
        );
      })}
    </div>
  );
}
