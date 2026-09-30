"use client";

// Sounds for the staff area, made in the browser as small WAV files and
// played with an <audio> element. (Plain <audio> also plays on iPhones in
// silent mode and after the page has been unlocked by one tap, which the
// Web Audio API doesn't always do.)

// Every sound is soft: sine waves with a few gentle overtones and a natural
// fade (like a small bell or marimba) - no harsh square or saw waves.
type Tone = {
  /** pitch in Hz (with f1: glides f0 → f1 → f0) */
  f0: number;
  f1?: number;
  dur: number;
  gap?: number;
  /** "bell" rings out and fades; "pad" holds steady (for alarms / ringback) */
  kind?: "bell" | "pad";
  /** loudness of this note, 0-1 */
  gain?: number;
};

const BELL = [
  [1, 1],
  [2, 0.28],
  [3, 0.08],
  [4.2, 0.03],
] as const;
const PAD = [
  [1, 1],
  [2, 0.12],
] as const;

function wav(tones: Tone[], rate = 44100): string {
  // notes may ring on into the next one (like a real bell)
  const tail = 0.5;
  const total = tones.reduce((n, t) => n + t.dur + (t.gap ?? 0), 0) + tail;
  const len = Math.ceil(total * rate);
  const mix = new Float32Array(len);
  let at = 0;
  for (const t of tones) {
    const bell = (t.kind ?? "bell") === "bell";
    const n = Math.floor((bell ? t.dur + tail : t.dur) * rate);
    const parts = bell ? BELL : PAD;
    const phases = parts.map(() => 0);
    for (let k = 0; k < n && at + k < len; k++) {
      const p = k / Math.floor(t.dur * rate);
      const f = t.f1 ? t.f0 + (t.f1 - t.f0) * (p < 0.5 ? p * 2 : Math.max(0, (1 - p) * 2)) : t.f0;
      let v = 0;
      parts.forEach(([mul, amp], j) => {
        phases[j] += (2 * Math.PI * f * mul) / rate;
        // higher overtones die away sooner, which is what makes it sound warm
        v += Math.sin(phases[j]) * amp * (bell ? Math.exp((-k / rate) * (3 + j * 4)) : 1);
      });
      const sec = k / rate;
      const attack = Math.min(1, sec / 0.006);
      const release = bell ? Math.min(1, (n - k) / (rate * 0.05)) : Math.min(1, (n - k) / (rate * 0.08), sec / 0.04);
      mix[at + k] += v * attack * release * (t.gain ?? 1);
    }
    at += Math.floor((t.dur + (t.gap ?? 0)) * rate);
  }
  let peak = 0;
  for (const v of mix) peak = Math.max(peak, Math.abs(v));
  const scale = peak ? 0.7 / peak : 0;
  const data = new Int16Array(len);
  for (let k = 0; k < len; k++) data[k] = Math.round(mix[k] * scale * 32767);
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
  // SOS: still clear and urgent, but a smooth two-tone (not a buzzing siren)
  siren: () => wav([{ f0: 740, dur: 0.42, kind: "pad", gap: 0.04 }, { f0: 587, dur: 0.42, kind: "pad", gap: 0.04 }, { f0: 740, dur: 0.42, kind: "pad", gap: 0.04 }, { f0: 587, dur: 0.42, kind: "pad" }]),
  // a new message: a soft two-note "ding-dong"
  chime: () => wav([{ f0: 1175, dur: 0.14, gain: 0.8 }, { f0: 880, dur: 0.3, gain: 0.7 }]),
  alert: () => wav([{ f0: 988, dur: 0.14 }, { f0: 1175, dur: 0.14 }, { f0: 1480, dur: 0.3 }]),
  ok: () => wav([{ f0: 784, dur: 0.1, gain: 0.8 }, { f0: 1175, dur: 0.25 }]),
  ringback: () => wav([{ f0: 440, dur: 0.9, kind: "pad", gain: 0.6 }]),
  // an incoming call: a short marimba tune
  ring: () => wav([{ f0: 659, dur: 0.16 }, { f0: 784, dur: 0.16 }, { f0: 988, dur: 0.16 }, { f0: 784, dur: 0.16 }, { f0: 988, dur: 0.16 }, { f0: 1319, dur: 0.4 }]),
  // a scan that didn't work: two soft falling notes (not a buzz)
  no: () => wav([{ f0: 494, dur: 0.14, gain: 0.8 }, { f0: 392, dur: 0.3, gain: 0.8 }]),
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
