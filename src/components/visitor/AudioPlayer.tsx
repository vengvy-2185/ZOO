"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Download, Volume2, Square, FileText, Loader2, Sparkles } from "lucide-react";
import type { AudioGuide, AudioLanguage } from "@/types/domain";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SPEECH_LANG: Record<AudioLanguage, string> = { km: "km-KH", en: "en-US", zh: "zh-CN" };

/** Picks the nicest installed voice: natural/neural/online voices first, then Google, then anything local. */
function bestVoice(voices: SpeechSynthesisVoice[], lang: AudioLanguage, female = true) {
  const prefix = SPEECH_LANG[lang].slice(0, 2);
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural/i.test(v.name) ? 100 : 0) +
    (/online/i.test(v.name) ? 40 : 0) +
    (/google/i.test(v.name) ? 30 : 0) +
    (v.lang.toLowerCase() === SPEECH_LANG[lang].toLowerCase() ? 10 : 0) +
    (female && /sreymom|jenny|aria|xiaoxiao|samantha|female/i.test(v.name) ? 5 : 0);
  return voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix)).sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Chrome stops long utterances after ~15 s, so speak sentence by sentence. */
function sentences(text: string) {
  return text.match(/[^.!?។៕\n]+[.!?។៕]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

// Plays the natural-voice recording (Azure Neural, generated once on the
// server and cached in Storage). If none can be made, it falls back to the
// best voice the device has — never a dead end.
export function AudioPlayer({
  animalCode,
  animalName,
  guides,
  fallbackText,
}: {
  animalCode: string;
  animalName: string;
  guides: AudioGuide[];
  /** Text to read aloud per language when no script exists (e.g. the biography). */
  fallbackText: Partial<Record<AudioLanguage, string | null>>;
}) {
  const { locale, t } = useI18n();
  const LANGUAGES: { code: AudioLanguage; label: string; flag: string }[] = [
    { code: "km", label: t.audio.khmer, flag: "🇰🇭" },
    { code: "en", label: t.audio.english, flag: "🇬🇧" },
    { code: "zh", label: t.audio.chinese, flag: "🇨🇳" },
  ];
  const [lang, setLang] = useState<AudioLanguage>(locale === "km" ? "km" : "en");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [generated, setGenerated] = useState<Partial<Record<AudioLanguage, string>>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tried = useRef<Set<AudioLanguage>>(new Set());

  const guide = useMemo(() => guides.find((g) => g.language === lang && g.is_active) ?? null, [guides, lang]);
  const text = guide?.transcript || fallbackText[lang] || null;
  const url = guide?.audio_url || generated[lang] || null;

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setNoVoice(false);
    setPlaying(false);
    setProgress(0);
  }, [lang]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  /** Ask the server for a natural-voice recording; resolves to its URL or null. */
  async function fetchNatural(): Promise<string | null> {
    if (tried.current.has(lang)) return null;
    tried.current.add(lang);
    setPreparing(true);
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: animalCode, lang }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setGenerated((g) => ({ ...g, [lang]: data.url }));
        return data.url as string;
      }
    } catch {
      /* fall through to the device voice */
    } finally {
      setPreparing(false);
    }
    return null;
  }

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    el.playbackRate = speed;
    await el.play().catch(() => setPlaying(false));
  }

  function seek(delta: number) {
    const el = audioRef.current;
    if (el) el.currentTime = Math.max(0, el.currentTime + delta);
  }

  function speakWithDevice() {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    const voice = bestVoice(voices.length ? voices : synth.getVoices(), lang);
    if (!voice && lang !== "en") setNoVoice(true);
    synth.cancel();
    const parts = sentences(text);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = SPEECH_LANG[lang];
      if (voice) u.voice = voice;
      u.rate = speed * (lang === "en" ? 1 : 0.92);
      u.pitch = 1.05;
      if (i === parts.length - 1) {
        u.onend = () => setSpeaking(false);
      }
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }

  async function listen() {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    const natural = await fetchNatural();
    if (natural) {
      // Autoplay once the new <audio> element has mounted.
      requestAnimationFrame(() => {
        const el = audioRef.current;
        if (el) {
          el.playbackRate = speed;
          el.play().catch(() => {});
        }
      });
      return;
    }
    speakWithDevice();
  }

  const deviceVoice = useMemo(() => bestVoice(voices, lang), [voices, lang]);

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5">
      <div className="relative bg-gradient-to-br from-primary to-forest px-6 pb-6 pt-7 text-center text-white">
        <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15", (playing || speaking) && "animate-pulse")}>
          <Volume2 size={28} />
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{t.audio.title(animalName)}</h1>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                lang === l.code ? "bg-white text-primary shadow-soft" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        {/* Equaliser bars while audio plays */}
        <div className="mt-4 flex h-6 items-end justify-center gap-1" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-leaf/80"
              style={{
                height: playing || speaking ? undefined : 4,
                animation: playing || speaking ? `gwzEq ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.05}s infinite alternate` : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        {url ? (
          <>
            <audio
              ref={audioRef}
              src={url}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                setProgress(0);
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setProgress(el.duration ? el.currentTime / el.duration : 0);
              }}
            />
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => seek(-10)} className="flex h-11 w-11 items-center justify-center rounded-full bg-light-green text-primary" aria-label="-10s">
                <RotateCcw size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lift transition active:scale-95"
                aria-label={playing ? t.audio.pause : t.audio.play}
              >
                {playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={() => seek(10)} className="flex h-11 w-11 items-center justify-center rounded-full bg-light-green text-primary" aria-label="+10s">
                <RotateCw size={18} />
              </button>
            </div>
            <div
              className="mt-5 h-2 cursor-pointer overflow-hidden rounded-full bg-light-green"
              onClick={(e) => {
                const el = audioRef.current;
                const r = e.currentTarget.getBoundingClientRect();
                if (el?.duration) el.currentTime = ((e.clientX - r.left) / r.width) * el.duration;
              }}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles size={13} /> {t.audio.naturalVoice}
            </p>
          </>
        ) : (
          <div className="text-center">
            {text ? (
              <>
                <button onClick={listen} disabled={preparing} className="btn-primary mx-auto px-7 py-3.5 text-base hover:translate-y-0">
                  {preparing ? <Loader2 size={18} className="animate-spin" /> : speaking ? <Square size={16} /> : <Volume2 size={18} />}
                  {preparing ? t.audio.preparing : speaking ? t.audio.stop : t.audio.readAloud}
                </button>
                {tried.current.has(lang) && !preparing && deviceVoice && (
                  <p className="mt-3 text-[11px] text-ink/45">
                    {t.audio.deviceVoice}: {deviceVoice.name.replace(/Microsoft |Google | - .*$/g, "")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink/55">{t.audio.notAvailable}</p>
            )}
            {noVoice && <p className="mt-3 text-xs text-amber-700">{t.audio.noVoice}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-ink/55">
          {t.audio.speed}:
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                if (audioRef.current) audioRef.current.playbackRate = s;
              }}
              className={cn("rounded-full px-2.5 py-1 transition", speed === s ? "bg-primary text-white" : "bg-light-green text-primary")}
            >
              {s}x
            </button>
          ))}
        </div>

        {url && (
          <a href={url} download target="_blank" rel="noreferrer" className="btn-outline mt-6 w-full">
            <Download size={16} /> {t.audio.download}
          </a>
        )}

        {text && (
          <div className="mt-6 rounded-3xl bg-cream p-5 ring-1 ring-primary/10">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <FileText size={14} /> {t.audio.transcript}
            </div>
            <p className="text-sm leading-relaxed text-ink/80">{text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
