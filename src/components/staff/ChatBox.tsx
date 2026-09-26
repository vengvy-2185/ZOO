"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { SendHorizonal, Loader2, Mic, Trash2, Play, Pause } from "lucide-react";
import { sendChat, type ChatState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-label="send" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white shadow-soft transition active:scale-90 disabled:opacity-60">
      {pending ? <Loader2 size={20} className="animate-spin" /> : <SendHorizonal size={20} />}
    </button>
  );
}

/** Keeps the chat scrolled to the newest message when new ones arrive. */
export function ChatScroll({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[#F8FAFF] bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.06)_1px,transparent_0)] p-3 [background-size:18px_18px] md:p-5">
      {children}
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** A voice message: play / pause, a moving bar, and the length. */
export function VoiceBubble({ src, secs, own }: { src: string; secs: number; own: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      document.querySelectorAll<HTMLAudioElement>("audio[data-voice]").forEach((x) => x !== a && x.pause());
      a.play().catch(() => {});
    } else a.pause();
  };
  const pct = secs ? Math.min(100, (t / secs) * 100) : 0;
  return (
    <div className={cn("flex w-56 max-w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 shadow-sm sm:w-64", own ? "rounded-br-md bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white" : "rounded-bl-md bg-white text-forest ring-1 ring-black/5")}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        data-voice
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
      />
      <button type="button" onClick={toggle} aria-label={playing ? "pause" : "play"} className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition active:scale-90", own ? "bg-white text-[#1D4ED8]" : "bg-[#1D4ED8] text-white")}>
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      {/* little bars like a sound wave, filled as it plays */}
      <div className="relative flex h-7 flex-1 items-center gap-[3px] overflow-hidden">
        {Array.from({ length: 22 }, (_, i) => {
          const h = 30 + ((i * 37) % 70);
          const on = (i / 22) * 100 < pct;
          return <span key={i} className={cn("w-[3px] flex-shrink-0 rounded-full transition-colors", on ? (own ? "bg-white" : "bg-[#1D4ED8]") : own ? "bg-white/40" : "bg-[#BFDBFE]", playing && "animate-pulse")} style={{ height: `${h}%` }} />;
        })}
      </div>
      <span className={cn("w-9 flex-shrink-0 text-right font-mono text-[11px] font-bold", own ? "text-white/85" : "text-ink/50")}>{fmt(playing || t ? t : secs)}</span>
    </div>
  );
}

/** Type and send (Enter sends, Shift+Enter = new line), or record a voice message. */
export function ChatComposer({ channel, km }: { channel: string; km: boolean }) {
  const [state, action] = useFormState<ChatState, FormData>(sendChat, {});
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const [mode, setMode] = useState<"text" | "recording" | "sending">("text");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      box.current?.focus();
    }
    if (state.ok || state.error) setMode("text");
    if (state.error) setErr(state.error === "too-long" ? (km ? "សំឡេងវែងពេក" : "Too long") : state.error);
  }, [state, km]);

  const stop = (send: boolean) => {
    const r = rec.current;
    if (!r) return;
    const length = Math.max(1, Math.round((Date.now() - started.current) / 1000));
    r.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      if (!send) return setMode("text");
      const type = (r.mimeType || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type });
      const fd = new FormData();
      fd.set("channel", channel);
      fd.set("secs", String(length));
      fd.set("audio", new File([blob], `voice.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`, { type }));
      setMode("sending");
      action(fd);
    };
    r.stop();
  };

  useEffect(() => {
    if (mode !== "recording") return;
    const id = setInterval(() => {
      const s = (Date.now() - started.current) / 1000;
      setSecs(s);
      if (s >= 120) stop(true); // two minutes at most
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.current = r;
      r.start(250);
      started.current = Date.now();
      setSecs(0);
      setMode("recording");
      navigator.vibrate?.(40);
    } catch {
      setErr(km ? "សូមអនុញ្ញាតឲ្យប្រើមីក្រូហ្វូន" : "Please allow the microphone");
    }
  };

  if (mode !== "text")
    return (
      <div className="flex items-center gap-2 border-t border-black/5 bg-white p-3">
        <button type="button" onClick={() => stop(false)} disabled={mode === "sending"} aria-label="cancel" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-ink/55 transition hover:bg-red-50 hover:text-red-600 active:scale-90">
          <Trash2 size={19} />
        </button>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-red-50 px-4 ring-1 ring-red-100">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400" />
            <span className="relative h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-sm font-extrabold text-red-600">{fmt(secs)}</span>
          <span className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
            {Array.from({ length: 28 }, (_, i) => (
              <span key={i} className="w-[3px] flex-shrink-0 animate-pulse rounded-full bg-red-300" style={{ height: `${8 + ((i * 53) % 18)}px`, animationDelay: `${(i % 7) * 90}ms` }} />
            ))}
          </span>
          <span className="hidden text-xs font-bold text-red-500 sm:inline">{mode === "sending" ? (km ? "កំពុងផ្ញើ…" : "Sending…") : km ? "កំពុងថត…" : "Recording…"}</span>
        </div>
        <button type="button" onClick={() => stop(true)} disabled={mode === "sending"} aria-label="send voice" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white shadow-soft active:scale-90">
          {mode === "sending" ? <Loader2 size={20} className="animate-spin" /> : <SendHorizonal size={20} />}
        </button>
      </div>
    );

  return (
    <form ref={form} action={action} className="border-t border-black/5 bg-white p-3">
      {err && <p className="mb-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">{err}</p>}
      <div className="flex items-end gap-2">
        <input type="hidden" name="channel" value={channel} />
        <button type="button" onClick={start} aria-label={km ? "ថតសំឡេង" : "Record voice"} title={km ? "ថតសំឡេង" : "Voice message"} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8] transition hover:bg-[#DBEAFE] active:scale-90">
          <Mic size={20} />
        </button>
        <textarea
          ref={box}
          name="body"
          data-live-ok
          maxLength={1000}
          rows={1}
          placeholder={km ? "សរសេរសារ…" : "Write a message…"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (box.current?.value.trim()) form.current?.requestSubmit();
            }
          }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(140, t.scrollHeight)}px`;
          }}
          className="max-h-36 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-black/10 bg-[#F8FAFF] px-4 py-3 text-sm text-ink outline-none focus:border-[#2563EB] focus:bg-white"
        />
        <SendButton />
      </div>
    </form>
  );
}
