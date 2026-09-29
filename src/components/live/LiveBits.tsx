"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type LiveComment = { id: string; name: string; avatar: string | null; staff: boolean; body: string; created_at: string };

/** Comments arrive for everyone at once (only visible ones are ever sent to the browser). */
export function useLiveComments(streamId: string, initial: LiveComment[]) {
  const [list, setList] = useState<LiveComment[]>(initial);
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`live-comments-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_comments", filter: `stream_id=eq.${streamId}` }, (e: any) => {
        const c = e.new;
        if (c && !c.hidden) setList((l) => (l.some((x) => x.id === c.id) ? l : [...l, c].slice(-200)));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [streamId]);
  const hide = (id: string) => setList((l) => l.filter((x) => x.id !== id));
  return { list, hide };
}

/** Hearts floating up from the corner (Facebook / TikTok style). */
export function useHearts() {
  const [hearts, setHearts] = useState<{ id: number; x: number; e: string }[]>([]);
  const n = useRef(0);
  const pop = (count = 1) => {
    const emo = ["❤️", "💚", "💛", "🧡", "💙", "💖"];
    const add = Array.from({ length: Math.min(count, 8) }, () => ({ id: ++n.current, x: Math.random() * 40 - 20, e: emo[Math.floor(Math.random() * emo.length)] }));
    setHearts((h) => [...h, ...add].slice(-40));
    const ids = add.map((a) => a.id);
    setTimeout(() => setHearts((h) => h.filter((x) => !ids.includes(x.id))), 2600);
  };
  const layer = (
    <div className="pointer-events-none absolute bottom-20 right-4 z-10 h-72 w-16">
      {hearts.map((h) => (
        <span key={h.id} className="absolute bottom-0 left-1/2 text-3xl [animation:gwzFloat_2.6s_ease-out_forwards]" style={{ marginLeft: h.x }}>
          {h.e}
        </span>
      ))}
    </div>
  );
  return { pop, layer };
}

export function CommentRow({ c, dark = false, onHide, hideLabel }: { c: LiveComment; dark?: boolean; onHide?: () => void; hideLabel?: string }) {
  return (
    <div className={cn("flex animate-[gwzPop_.25s_ease-out_both] items-start gap-2", dark && "drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]")}>
      <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-extrabold", dark ? "bg-white/20 text-white" : "bg-[#DCFCE7] text-forest")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.avatar ? <img src={c.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...c.name][0]?.toUpperCase()}
      </span>
      <p className={cn("min-w-0 flex-1 text-sm leading-snug", dark ? "text-white" : "text-ink/80")}>
        <b className={cn("mr-1.5", dark ? "text-white/90" : "text-forest")}>{c.name}</b>
        {c.staff && <span className="mr-1.5 rounded-full bg-emerald-500 px-1.5 py-px text-[10px] font-bold text-white">GWZ</span>}
        <span className="break-words">{c.body}</span>
      </p>
      {onHide && (
        <button type="button" onClick={onHide} aria-label={hideLabel} title={hideLabel} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black/40 text-xs text-white hover:bg-red-600">
          ×
        </button>
      )}
    </div>
  );
}

export const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
