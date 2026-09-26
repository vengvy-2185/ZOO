"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, VolumeX, Siren } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { playSound, unlockSound, soundUnlocked } from "@/lib/client-sound";

type Alert = { id: string; kind: string; place: string | null; name: string; own: boolean; created_at: string };
type Data = { allowed: boolean; alerts?: Alert[]; chime?: string[]; sound?: { enabled: boolean; volume: number; every: number } };

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
  const { locale } = useI18n();
  const km = locale === "km";
  const [d, setD] = useState<Data | null>(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const allowed = useRef(false);

  useEffect(() => setMuted(get(MUTED)), []);
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
    const id = setInterval(() => allowed.current && document.visibilityState === "visible" && load(), 6000);
    return () => {
      alive = false;
      clearInterval(id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimeKey, ready]);

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
        <div className="fixed bottom-[9.5rem] left-4 z-[70] md:bottom-[5.5rem] md:left-6">
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
