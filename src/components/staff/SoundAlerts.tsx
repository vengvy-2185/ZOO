"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, BellRing } from "lucide-react";

const MUTED_KEY = "gwz_sos_muted"; // SOS ids someone already silenced on this device
const SEEN_TASKS_KEY = "gwz_tasks_seen";

const read = (k: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "[]");
  } catch {
    return [];
  }
};
const write = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v.slice(-200)));
  } catch {
    /* ignore */
  }
};

/**
 * Sounds for the staff area, made with the Web Audio API (no sound files):
 * a siren that repeats while an SOS is open (until it is resolved or
 * silenced here), and a short chime when a new task arrives for you.
 * Browsers only play sound after the first tap on the page, so the sound is
 * switched on by that first tap; until then a button asks for it.
 */
export function SoundAlerts({ alertIds, taskIds, km }: { alertIds: string[]; taskIds: string[]; km: boolean }) {
  const ctx = useRef<AudioContext | null>(null);
  const [ready, setReady] = useState(false);
  const [ringing, setRinging] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const audio = useCallback(() => {
    if (!ctx.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx.current = new AC();
    }
    return ctx.current;
  }, []);

  // unlock sound on the first tap / key press anywhere
  useEffect(() => {
    const unlock = () => {
      const a = audio();
      a?.resume().then(() => setReady(a.state === "running")).catch(() => {});
    };
    const a = audio();
    if (a && a.state === "running") setReady(true);
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audio]);

  /** Two rising-and-falling sweeps, like an alarm. */
  const siren = useCallback(() => {
    const a = audio();
    if (!a || a.state !== "running") return;
    const t = a.currentTime;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sawtooth";
    for (let i = 0; i < 2; i++) {
      osc.frequency.setValueAtTime(650, t + i * 0.9);
      osc.frequency.linearRampToValueAtTime(1250, t + i * 0.9 + 0.45);
      osc.frequency.linearRampToValueAtTime(650, t + i * 0.9 + 0.9);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
    gain.gain.setValueAtTime(0.22, t + 1.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + 1.85);
    navigator.vibrate?.([400, 150, 400]);
  }, [audio]);

  /** A short friendly "ding-dong". */
  const chime = useCallback(() => {
    const a = audio();
    if (!a || a.state !== "running") return;
    const t = a.currentTime;
    [
      [880, 0],
      [1320, 0.18],
    ].forEach(([f, d]) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
      o.connect(g).connect(a.destination);
      o.start(t + d);
      o.stop(t + d + 0.55);
    });
    navigator.vibrate?.(120);
  }, [audio]);

  // SOS: ring while there's an open alert nobody silenced on this device
  const loud = alertIds.filter((id) => !read(MUTED_KEY).includes(id));
  const loudKey = loud.join(",");
  useEffect(() => {
    setRinging(loud.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loudKey]);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!ringing || !ready) return;
    siren();
    timer.current = setInterval(siren, 2600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ringing, ready, siren]);

  // new task for me: one chime (the first visit just remembers what's there)
  useEffect(() => {
    if (!ready) return;
    const seen = read(SEEN_TASKS_KEY);
    const first = localStorage.getItem(SEEN_TASKS_KEY) === null;
    const fresh = taskIds.filter((id) => !seen.includes(id));
    if (fresh.length && !first) chime();
    if (fresh.length || first) write(SEEN_TASKS_KEY, [...seen, ...fresh]);
  }, [taskIds, ready, chime]);

  const silence = () => {
    write(MUTED_KEY, [...read(MUTED_KEY), ...alertIds]);
    setRinging(false);
    navigator.vibrate?.(0);
  };

  if (ringing)
    return (
      <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 md:bottom-6">
        {!ready ? (
          <button onClick={() => audio()?.resume().then(() => setReady(true))} className="flex animate-bounce items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-lift ring-4 ring-white">
            <BellRing size={18} /> {km ? "ចុចដើម្បីបើកសំឡេង SOS" : "Tap to turn on SOS sound"}
          </button>
        ) : (
          <button onClick={silence} className="flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white shadow-lift ring-4 ring-white">
            <VolumeX size={18} /> {km ? "បិទសំឡេង" : "Silence"}
            <span className="relative ml-1 flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-red-400" /><span className="relative h-2.5 w-2.5 rounded-full bg-red-500" /></span>
          </button>
        )}
      </div>
    );
  // a small hint while sound is still locked, only if there's something to hear later
  if (!ready && taskIds.length === 0) return null;
  return ready ? null : (
    <button onClick={() => audio()?.resume().then(() => setReady(true))} className="fixed bottom-24 right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1D4ED8] shadow-lift ring-1 ring-black/5 md:bottom-6" title={km ? "បើកសំឡេង" : "Turn on sound"}>
      <Volume2 size={19} />
    </button>
  );
}
