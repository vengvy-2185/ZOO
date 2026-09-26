"use client";

// Sounds for the staff area, made in the browser as small WAV files and
// played with an <audio> element. (Plain <audio> also plays on iPhones in
// silent mode and after the page has been unlocked by one tap, which the
// Web Audio API doesn't always do.)

type Tone = { f0: number; f1?: number; dur: number; wave?: "sine" | "saw" | "square"; gap?: number };

function wav(tones: Tone[], rate = 22050): string {
  const total = tones.reduce((n, t) => n + t.dur + (t.gap ?? 0), 0);
  const len = Math.ceil(total * rate);
  const data = new Int16Array(len);
  let i = 0;
  for (const t of tones) {
    const n = Math.floor(t.dur * rate);
    let phase = 0;
    for (let k = 0; k < n && i < len; k++, i++) {
      const p = k / n;
      const f = t.f1 ? t.f0 + (t.f1 - t.f0) * (p < 0.5 ? p * 2 : (1 - p) * 2) : t.f0;
      phase += (2 * Math.PI * f) / rate;
      const s = t.wave === "saw" ? ((phase / Math.PI) % 2) - 1 : t.wave === "square" ? (Math.sin(phase) > 0 ? 0.6 : -0.6) : Math.sin(phase);
      const env = Math.min(1, k / (rate * 0.01), (n - k) / (rate * 0.03)); // soft start/end
      data[i] = Math.max(-1, Math.min(1, s * env * 0.9)) * 32767;
    }
    i += Math.floor((t.gap ?? 0) * rate);
  }
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, j) => v.setUint8(o + j, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + len * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, len * 2, true);
  new Int16Array(buf, 44).set(data);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

const SOUNDS = {
  siren: () => wav([{ f0: 650, f1: 1300, dur: 0.9, wave: "saw" }, { f0: 650, f1: 1300, dur: 0.9, wave: "saw" }]),
  chime: () => wav([{ f0: 880, dur: 0.22 }, { f0: 1320, dur: 0.45 }]),
  alert: () => wav([{ f0: 1000, dur: 0.12, wave: "square", gap: 0.06 }, { f0: 1000, dur: 0.12, wave: "square", gap: 0.06 }, { f0: 1400, dur: 0.25, wave: "square" }]),
  ok: () => wav([{ f0: 660, dur: 0.12 }, { f0: 990, dur: 0.25 }]),
};
export type SoundName = keyof typeof SOUNDS;

const urls: Partial<Record<SoundName, string>> = {};
let player: HTMLAudioElement | null = null;
let unlocked = false;

function el() {
  if (!player && typeof window !== "undefined") {
    player = new Audio();
    player.preload = "auto";
  }
  return player;
}

/** Call from a tap: lets the page play sounds from now on. */
export function unlockSound(): Promise<boolean> {
  const a = el();
  if (!a) return Promise.resolve(false);
  if (unlocked) return Promise.resolve(true);
  a.src = (urls.ok ??= SOUNDS.ok());
  a.volume = 0.001;
  return a
    .play()
    .then(() => {
      unlocked = true;
      a.pause();
      return true;
    })
    .catch(() => false);
}
export const soundUnlocked = () => unlocked;

/** Play one sound; resolves false when the browser still blocks it. */
export function playSound(name: SoundName, volume = 0.8): Promise<boolean> {
  const a = el();
  if (!a) return Promise.resolve(false);
  a.pause();
  a.src = (urls[name] ??= SOUNDS[name]());
  a.volume = Math.max(0, Math.min(1, volume));
  a.currentTime = 0;
  return a
    .play()
    .then(() => {
      unlocked = true;
      return true;
    })
    .catch(() => false);
}
