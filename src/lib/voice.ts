"use client";

// Reads short messages aloud, in Khmer or English (whichever the text is in).
// The natural Azure voice when the zoo has set it up (/api/speak), otherwise
// the phone's own voice. One at a time, never the same sentence twice in a row.
// Anyone can switch it off (the 🔊 button); the choice stays on the device.

const KEY = "gwz-voice";
let queue: string[] = [];
let playing = false;
let last = { text: "", at: 0 };

export function voiceOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setVoice(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (!on) {
    queue = [];
    speechSynthesis?.cancel?.();
  }
  window.dispatchEvent(new Event("gwz-voice"));
}

/** Emojis, arrows and extra spaces out; nothing longer than a short paragraph. */
function clean(text: string) {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}✓✔→←↓↑·•]/gu, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}
const isKhmer = (t: string) => /[ក-៿]/.test(t);

/** Say something (quietly ignored when the voice is off or the text is empty). */
export function say(text: string) {
  if (typeof window === "undefined" || !voiceOn()) return;
  const t = clean(text);
  if (t.length < 2) return;
  if (t === last.text && Date.now() - last.at < 8000) return;
  last = { text: t, at: Date.now() };
  queue.push(t);
  if (queue.length > 4) queue = queue.slice(-4); // don't fall behind
  if (!playing) next();
}

async function next() {
  const t = queue.shift();
  if (!t) {
    playing = false;
    return;
  }
  playing = true;
  const lang = isKhmer(t) ? "km" : "en";
  try {
    const r = await fetch(`/api/speak?l=${lang}&t=${encodeURIComponent(t)}`);
    if (r.status === 200) {
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url);
      await new Promise<void>((done) => {
        a.onended = a.onerror = () => done();
        a.play().catch(() => done());
      });
      URL.revokeObjectURL(url);
      return next();
    }
  } catch {
    /* fall back to the phone's voice */
  }
  await device(t, lang);
  next();
}

/** The phone's / computer's own voice (English everywhere; Khmer where the device has it). */
function device(text: string, lang: "km" | "en") {
  return new Promise<void>((done) => {
    const synth = window.speechSynthesis;
    if (!synth) return done();
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang?.toLowerCase().startsWith(lang === "km" ? "km" : "en"));
    if (lang === "km" && !voice) return done(); // no Khmer voice here: stay quiet rather than garble it
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "km" ? "km-KH" : "en-US";
    if (voice) u.voice = voice;
    u.rate = 1;
    u.onend = u.onerror = () => done();
    synth.speak(u);
    setTimeout(done, 15000);
  });
}
