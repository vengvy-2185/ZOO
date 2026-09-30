"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, VolumeX, Siren, X, Phone, PhoneOff, Video, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { playSound, unlockSound, soundUnlocked } from "@/lib/client-sound";
import { createClient } from "@/lib/supabase/client";
import { say } from "@/lib/voice";

type Alert = { id: string; kind: string; place: string | null; name: string; own: boolean; created_at: string };
type News = { key: string; kind: "chat" | "notice"; channel: string | null; title: string; body: string; avatar: string | null; url: string };
type Ring = { id: string; video: boolean; direct?: boolean; room: string; name: string; avatar: string | null };
type Data = { allowed: boolean; alerts?: Alert[]; chime?: string[]; sound?: { enabled: boolean; volume: number; every: number }; news?: News[]; calls?: Ring[]; unread?: number };

const MUTED = "gwz_sos_muted";
const SEEN = "gwz_chime_seen";
const get = (k: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "null") ?? [];
  } catch {
    return [];
  }
};
const put = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v.slice(-400)));
  } catch {
    /* ignore */
  }
};
const KIND_KM: Record<string, string> = { medical: "មានអ្នករបួស/ឈឺ", animal: "សត្វរត់ចេញ", security: "បញ្ហាសន្តិសុខ", fire: "ភ្លើង/ផ្សែង", child: "ក្មេងវង្វេង", other: "បន្ទាន់" };
const KIND_EN: Record<string, string> = { medical: "Someone hurt", animal: "Animal escaped", security: "Security", fire: "Fire", child: "Lost child", other: "Emergency" };

/**
 * On every page, for signed-in staff and admins: checks every 6 seconds for
 * SOS alerts and news. An SOS rings a siren until it is resolved or silenced
 * on this device; a new task / notice / request plays a chime. Sound needs
 * one tap on the page first (a browser rule), so a button asks for it.
 */
export function GlobalStaffSound() {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<(News & { at: number })[]>([]);
  const [declined, setDeclined] = useState<string[]>([]);
  const { locale } = useI18n();
  const km = locale === "km";
  const [d, setD] = useState<Data | null>(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const allowed = useRef(false);

  useEffect(() => setMuted(get(MUTED)), []);
  // keep the sound prompt just above the SOS button, wherever it was dragged
  const [sosPos, setSosPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        setSosPos(JSON.parse(localStorage.getItem("gwz_sos_pos") ?? "null"));
      } catch {
        /* ignore */
      }
    };
    read();
    window.addEventListener("gwz-sos-move", read);
    return () => window.removeEventListener("gwz-sos-move", read);
  }, []);
  // one tap anywhere switches sound on
  useEffect(() => {
    const on = () => unlockSound().then((ok) => ok && setReady(true));
    window.addEventListener("pointerdown", on);
    window.addEventListener("keydown", on);
    return () => {
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/staff/alerts?p=${encodeURIComponent(location.pathname)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((x: Data) => {
          allowed.current = x.allowed;
          if (alive) setD(x);
        })
        .catch(() => {});
    load();
    const id = setInterval(() => allowed.current && document.visibilityState === "visible" && load(), 5000);
    // a call or a message: check at once (don't wait for the next 5 seconds)
    const sb = createClient();
    let soon: ReturnType<typeof setTimeout> | undefined;
    const ch = sb
      .channel("gwz-staff-news")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_updates" }, (e: any) => {
        const t = e.new?.topic;
        if (allowed.current && (t === "staff_calls" || t === "staff_messages" || t === "staff_alerts")) {
          clearTimeout(soon);
          soon = setTimeout(load, 300);
        }
      })
      .subscribe();
    return () => {
      alive = false;
      clearInterval(id);
      clearTimeout(soon);
      sb.removeChannel(ch);
    };
  }, [pathname]);

  const vol = (d?.sound?.volume ?? 80) / 100;
  const enabled = d?.sound?.enabled !== false;
  const loud = (d?.alerts ?? []).filter((a) => !a.own && !muted.includes(a.id));

  // siren loop
  const ringing = enabled && loud.length > 0;
  useEffect(() => {
    if (!ringing || !ready) return;
    playSound("siren", vol);
    navigator.vibrate?.([500, 200, 500]);
    const every = Math.max(2, Math.min(30, d?.sound?.every ?? 3)) * 1000;
    const id = setInterval(() => {
      playSound("siren", vol);
      navigator.vibrate?.([500, 200, 500]);
    }, every + 1800);
    return () => clearInterval(id);
  }, [ringing, ready, vol, d?.sound?.every]);

  // chimes for new things (the first check only remembers what's already there)
  const chimeKey = (d?.chime ?? []).join(",");
  useEffect(() => {
    if (!d?.allowed || !d.chime) return;
    const first = localStorage.getItem(SEEN) === null;
    const seen = get(SEEN);
    const fresh = d.chime.filter((c) => !seen.includes(c));
    if (fresh.length) put(SEEN, [...seen, ...fresh]);
    else if (first) put(SEEN, []);
    if (!first && fresh.length && enabled && ready && !ringing) playSound("chime", vol);
    // pop-ups on screen (also on a computer, where Windows may hide notifications)
    if (!first && fresh.length) {
      const looking = (ch: string | null) => location.pathname === "/staff/chat" && new URLSearchParams(location.search).get("c") === ch && document.visibilityState === "visible";
      const pop = (d.news ?? []).filter((n) => fresh.includes(n.key) && !(n.kind === "chat" && looking(n.channel)));
      if (pop.length) setToasts((t) => [...pop.map((n) => ({ ...n, at: Date.now() })), ...t.filter((x) => !pop.some((n) => n.key === x.key))].slice(0, 3));
      pop.slice(0, 2).forEach((n) => say(`${n.title.replace(/ · .*/, "")}. ${n.body}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimeKey, ready]);

  // pop-ups go away by themselves after 8 seconds
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((t) => t.filter((x) => Date.now() - x.at < 8000)), 1000);
    return () => clearTimeout(id);
  }, [toasts]);
  // unread messages on the app icon (computer / Android) and in the tab title
  useEffect(() => {
    const n = d?.unread ?? 0;
    const nav: any = navigator;
    if (n > 0) nav.setAppBadge?.(n).catch?.(() => {});
    else nav.clearAppBadge?.().catch?.(() => {});
    const base = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = n > 0 ? `(${n > 99 ? "99+" : n}) ${base}` : base;
  }, [d?.unread, pathname]);
  // someone is calling: ring until joined, declined or the call stops ringing
  const rings = (d?.calls ?? []).filter((c) => !declined.includes(c.id) && !pathname.startsWith("/staff/call"));
  const ringOn = rings.length > 0 && enabled;
  const firstRing = rings[0]?.id;
  useEffect(() => {
    if (firstRing && rings[0]) say(km ? `${rings[0].name} កំពុងហៅអ្នក` : `${rings[0].name} is calling`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstRing]);
  const sosKey = loud.map((a) => a.id).join(",");
  useEffect(() => {
    const a = loud[0];
    if (a) say(km ? `អាសន្ន! ${KIND_KM[a.kind] ?? ""}. ${a.name}${a.place ? `, ${a.place}` : ""}` : `Emergency! ${KIND_EN[a.kind] ?? ""}. ${a.name}${a.place ? `, ${a.place}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosKey]);
  useEffect(() => {
    if (!ringOn || !ready) return;
    playSound("ring", vol);
    navigator.vibrate?.([400, 200, 400]);
    const id = setInterval(() => {
      playSound("ring", vol);
      navigator.vibrate?.([400, 200, 400]);
    }, 2600);
    return () => clearInterval(id);
  }, [ringOn, ready, vol]);

  const silence = useCallback(() => {
    const next = [...muted, ...loud.map((a) => a.id)];
    setMuted(next);
    put(MUTED, next);
    navigator.vibrate?.(0);
  }, [muted, loud]);

  if (!d?.allowed) return null;
  const onStaff = pathname.startsWith("/staff");
  const inAlert = (d.alerts ?? []).filter((a) => !a.own);

  return (
    <>
      {/* incoming call */}
      {rings[0] && (
        <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[88] mx-auto max-w-sm animate-[gwzPop_.3s_ease-out_both] rounded-3xl bg-slate-900 p-4 text-white shadow-lift ring-1 ring-white/10 md:left-auto md:right-4 md:mx-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 flex-shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#1D4ED8] text-lg font-extrabold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {rings[0].avatar ? <img src={rings[0].avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...rings[0].name][0]}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{rings[0].name}</span>
              <span className="block truncate text-sm text-white/65">{rings[0].video ? (km ? "📹 ហៅជាវីដេអូ" : "📹 Video call") : km ? "📞 ហៅជាសំឡេង" : "📞 Voice call"} · {rings[0].room}</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDeclined((x) => [...x, rings[0].id]);
                // a call just to me: tell the caller straight away
                if (rings[0].direct) fetch("/api/staff/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rings[0].id, action: "end" }) }).catch(() => {});
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 font-extrabold active:scale-95"><PhoneOff size={18} /> {km ? "បដិសេធ" : "Decline"}</button>
            <button type="button" onClick={() => { setDeclined((x) => [...x, rings[0].id]); router.push(`/staff/call/${rings[0].id}?start=${rings[0].video ? "video" : "voice"}`); }} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-2.5 font-extrabold active:scale-95">{rings[0].video ? <Video size={18} /> : <Phone size={18} />} {km ? "ឆ្លើយ" : "Answer"}</button>
          </div>
        </div>
      )}
      {/* new messages / notices */}
      {toasts.length > 0 && !rings[0] && (
        <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[87] mx-auto flex max-w-sm flex-col gap-2 md:left-auto md:right-4 md:mx-0">
          {toasts.map((n) => (
            <div key={n.key} className="flex animate-[gwzPop_.3s_ease-out_both] items-start gap-3 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-black/5">
              <button type="button" onClick={() => { setToasts((t) => t.filter((x) => x.key !== n.key)); router.push(n.url); }} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {n.avatar ? <img src={n.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <MessageCircle size={19} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-forest">{n.title}</span>
                  <span className="line-clamp-2 text-sm text-ink/70">{n.body}</span>
                </span>
              </button>
              <button type="button" aria-label="close" onClick={() => setToasts((t) => t.filter((x) => x.key !== n.key))} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-ink/40 hover:bg-slate-100"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {/* outside the staff area (admin, public pages) there is no red bar, so show one here */}
      {!onStaff && inAlert.length > 0 && (
        <Link href="/staff" className="fixed bottom-24 left-4 z-[70] flex max-w-[20rem] items-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 py-2 pl-2 pr-4 text-white shadow-lift ring-4 ring-white/80 md:bottom-6 md:left-6">
          <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600"><Siren size={18} /></span>
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold">
            SOS · {(km ? KIND_KM : KIND_EN)[inAlert[0].kind] ?? "SOS"} — {inAlert[0].name}
            {inAlert[0].place && ` · ${inAlert[0].place}`}
          </span>
          
        </Link>
      )}

      {ringing && (
        <div className="fixed z-[70]" style={sosPos ? { left: sosPos.x, top: Math.max(8, sosPos.y - 48) } : { left: 16, bottom: 152 }}>
          {!ready || !soundUnlocked() ? (
            <button onClick={() => unlockSound().then((ok) => ok && setReady(true))} className="flex animate-[gwzPop_.4s_ease-out_both] items-center gap-2 whitespace-nowrap rounded-full bg-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-lift ring-4 ring-white/80">
              <BellRing size={15} className="animate-pulse" /> {km ? "ចុចដើម្បីបើកសំឡេង SOS" : "Tap to turn on SOS sound"}
            </button>
          ) : (
            <button onClick={silence} className="flex items-center gap-2 whitespace-nowrap rounded-full bg-forest px-4 py-2 text-xs font-extrabold text-white shadow-lift ring-4 ring-white/80">
              <VolumeX size={18} /> {km ? "បិទសំឡេង" : "Silence"}
              <span className="relative ml-1 flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-red-400" /><span className="relative h-2.5 w-2.5 rounded-full bg-red-500" /></span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
