"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SendHorizonal, Loader2, Mic, Trash2, Play, Pause, Plus, Image as ImageIcon, Camera, Paperclip, MapPin, X, Reply, FileText, AlertCircle } from "lucide-react";
import { sendChat, chatUploadSlot } from "@/app/staff/(protected)/actions";
import { enqueue, pendingOps, onQueueChange } from "@/lib/offline/queue";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

/** Keeps the chat scrolled to the newest message when new ones arrive. */
export function ChatScroll({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[#F8FAFF] bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.06)_1px,transparent_0)] p-3 [background-size:18px_18px] md:p-5">
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

/** The typing box grows with the text, up to about five lines, then scrolls. */
function grow(t: HTMLTextAreaElement) {
  t.style.height = "0px";
  const h = Math.min(132, Math.max(48, t.scrollHeight));
  t.style.height = `${h}px`;
  t.style.overflowY = t.scrollHeight > 132 ? "auto" : "hidden";
}


const MAX_FILE = 25 * 1024 * 1024;

/** Photos are made smaller on the phone first (max 1600 px): fast to send, same to look at. */
async function shrink(file: File): Promise<{ file: File; w?: number; h?: number }> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return { file };
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k);
    const h = Math.round(bmp.height * k);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
    if (!blob || (k === 1 && blob.size >= file.size)) return { file, w, h };
    return { file: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }), w, h };
  } catch {
    return { file };
  }
}

type Att = { key: string; file: File; preview?: string; status: "up" | "done" | "err"; path?: string; w?: number; h?: number; err?: string };
type ReplyTo = { id: string; name: string; text: string } | null;

/**
 * Type and send (Enter sends, Shift+Enter = new line), add photos / files /
 * location with +, paste or drop a picture, or record a voice message.
 * Photos and files go straight from the phone to storage while you type.
 */
export function ChatComposer({
  channel,
  km,
  reply = null,
  onCancelReply,
  onSent,
  onTyping,
  dropped = [],
  onDropTaken,
  onPending,
  onMessage,
}: {
  channel: string;
  km: boolean;
  reply?: ReplyTo;
  onCancelReply?: () => void;
  onSent?: () => void;
  onTyping?: () => void;
  dropped?: File[];
  onDropTaken?: () => void;
  /** show my message at once while it is on its way (done = it failed, take it away) */
  onPending?: (p: { key: string; body: string; images: string[]; files: string[] } | { key: string; done: true }) => void;
  /** the saved message, straight back from the server (shown at once) */
  onMessage?: (m: unknown) => void;
}) {
  const box = useRef<HTMLTextAreaElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const anyFile = useRef<HTMLInputElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const [mode, setMode] = useState<"text" | "recording" | "sending">("text");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState<string[]>([]);
  const [atts, setAtts] = useState<Att[]>([]);
  const [menu, setMenu] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [sending, setSending] = useState(false);

  // without internet, text messages wait on the phone and go out by themselves later
  useEffect(() => {
    const load = () => pendingOps().then((ops) => setQueued(ops.filter((o) => o.kind === "chat" && o.payload.channel === channel).map((o) => String(o.payload.body))));
    const net = () => setOnline(navigator.onLine);
    load();
    net();
    const off = onQueueChange(load);
    addEventListener("online", net);
    addEventListener("offline", net);
    return () => {
      off();
      removeEventListener("online", net);
      removeEventListener("offline", net);
    };
  }, [channel]);
  useEffect(() => {
    if (reply) box.current?.focus({ preventScroll: true });
  }, [reply]);

  const tooBig = km ? "ឯកសារធំពេក (អតិបរមា 25 MB)" : "Too big (25 MB at most)";
  const patch = (key: string, v: Partial<Att>) => setAtts((a) => a.map((x) => (x.key === key ? { ...x, ...v } : x)));
  const upload = async (key: string, raw: File) => {
    try {
      const { file, w, h } = await shrink(raw);
      if (file.size > MAX_FILE) throw new Error(tooBig);
      const slot = await chatUploadSlot(channel, file.name, file.size);
      if (!slot.path || !slot.token) throw new Error(slot.error === "too-big" ? tooBig : slot.error);
      const { error } = await createClient().storage.from("staff-files").uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      patch(key, { status: "done", path: slot.path, file, w, h });
    } catch (e) {
      patch(key, { status: "err", err: e instanceof Error ? e.message : "error" });
    }
  };
  const add = (files: File[]) => {
    setErr("");
    setMenu(false);
    const list = files.slice(0, Math.max(0, 10 - atts.length)).map((file) => ({ key: crypto.randomUUID(), file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined, status: "up" as const }));
    setAtts((a) => [...a, ...list]);
    list.forEach((a) => upload(a.key, a.file));
  };
  const remove = (key: string) =>
    setAtts((a) => {
      const x = a.find((y) => y.key === key);
      if (x?.preview) URL.revokeObjectURL(x.preview);
      return a.filter((y) => y.key !== key);
    });
  useEffect(() => {
    if (dropped.length) {
      add(dropped);
      onDropTaken?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropped]);

  const send = async (fd: FormData) => {
    fd.set("channel", channel);
    if (reply) fd.set("reply_to", reply.id);
    setSending(true);
    const r: { ok?: boolean; error?: string; msg?: unknown } = await sendChat({}, fd).catch(() => ({ error: km ? "មិនអាចផ្ញើបាន — សូមសាកម្តងទៀត" : "Could not send — try again" }));
    setSending(false);
    if (r.error) setErr(r.error === "too-long" ? (km ? "សំឡេងវែងពេក" : "Too long") : r.error === "invalid" ? (km ? "មិនអាចផ្ញើបាន" : "Could not send") : r.error);
    else {
      if (r.msg) onMessage?.(r.msg);
      onSent?.();
    }
    return !r.error;
  };
  const clearBox = () => {
    if (box.current) {
      box.current.value = "";
      grow(box.current);
    }
    setHasText(false);
  };

  const submit = async () => {
    const body = box.current?.value.trim() ?? "";
    if (!online) {
      if (!body) return;
      await enqueue("chat", { channel, body: body.slice(0, 1000) });
      clearBox();
      return;
    }
    const ready = atts.filter((a) => a.status === "done");
    if ((!body && !ready.length) || atts.some((a) => a.status === "up")) return;
    const fd = new FormData();
    if (body) fd.set("body", body);
    if (ready.length) fd.set("files", JSON.stringify(ready.map((a) => ({ path: a.path, name: a.file.name, type: a.file.type || "application/octet-stream", size: a.file.size, w: a.w, h: a.h }))));
    const key = crypto.randomUUID();
    onPending?.({ key, body, images: ready.filter((a) => a.preview).map((a) => a.preview!), files: ready.filter((a) => !a.preview).map((a) => a.file.name) });
    clearBox();
    const keep = atts;
    setAtts([]);
    const sentOk = await send(fd);
    onPending?.({ key, done: true }); // the real message is on screen now (or it failed)
    if (!sentOk) {
      setAtts(keep);
      if (box.current && body) {
        box.current.value = body; // give the text back so nothing is lost
        grow(box.current);
        setHasText(true);
      }
    }
    if (sentOk) box.current?.focus({ preventScroll: true });
  };

  const shareLocation = () => {
    setMenu(false);
    setErr("");
    if (!navigator.geolocation) return setErr(km ? "ឧបករណ៍នេះមិនស្គាល់ទីតាំង" : "No location on this device");
    setSending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fd = new FormData();
        fd.set("lat", String(pos.coords.latitude));
        fd.set("lng", String(pos.coords.longitude));
        fd.set("acc", String(Math.round(pos.coords.accuracy)));
        send(fd);
      },
      () => {
        setSending(false);
        setErr(km ? "សូមអនុញ្ញាតឲ្យប្រើទីតាំង (Location)" : "Please allow location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const stop = (doSend: boolean) => {
    const r = rec.current;
    if (!r) return;
    const length = Math.max(1, Math.round((Date.now() - started.current) / 1000));
    r.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      if (!doSend) return setMode("text");
      const type = (r.mimeType || "audio/webm").split(";")[0];
      const fd = new FormData();
      fd.set("secs", String(length));
      fd.set("audio", new File([new Blob(chunks.current, { type })], `voice.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`, { type }));
      setMode("sending");
      send(fd).then(() => setMode("text"));
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

  const uploading = atts.some((a) => a.status === "up");
  const canSend = hasText || atts.some((a) => a.status === "done");
  const pickBtn = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-forest hover:bg-slate-50";
  const picked = (e: React.ChangeEvent<HTMLInputElement>) => {
    add([...(e.target.files ?? [])]);
    e.target.value = "";
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative border-t border-black/5 bg-white p-3"
    >
      <input ref={gallery} type="file" accept="image/*,video/*" multiple hidden onChange={picked} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
      <input ref={anyFile} type="file" multiple hidden onChange={picked} />
      {err && (
        <p className="mb-2 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
          <AlertCircle size={14} /> {err}
        </p>
      )}
      {(queued.length > 0 || !online) && (
        <div className="mb-2 space-y-1">
          {queued.map((q, i) => (
            <p key={i} className="ml-auto w-fit max-w-[85%] truncate rounded-2xl rounded-br-md bg-[#1D4ED8]/60 px-3 py-1.5 text-sm text-white">⏳ {q}</p>
          ))}
          <p className="text-center text-[11px] font-bold text-amber-700">
            {online ? (km ? "កំពុងផ្ញើសារដែលរង់ចាំ…" : "Sending waiting messages…") : km ? "គ្មាន internet · សារនឹងផ្ញើដោយខ្លួនឯងពេល internet មកវិញ (រូប និងសំឡេង ត្រូវការ internet)" : "Offline · messages go out by themselves when the internet is back (photos and voice need internet)"}
          </p>
        </div>
      )}
      {reply && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-[#EEF2FF] px-3 py-2">
          <Reply size={16} className="flex-shrink-0 text-[#1D4ED8]" />
          <span className="min-w-0 flex-1 text-xs">
            <span className="font-bold text-[#1D4ED8]">{km ? `ឆ្លើយតប ${reply.name}` : `Replying to ${reply.name}`}</span>
            <span className="block truncate text-ink/60">{reply.text}</span>
          </span>
          <button type="button" onClick={onCancelReply} aria-label="cancel reply" className="flex h-7 w-7 items-center justify-center rounded-full text-ink/45 hover:bg-white">
            <X size={15} />
          </button>
        </div>
      )}
      {atts.length > 0 && (
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
          {atts.map((a) => (
            <div key={a.key} className={cn("relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1", a.status === "err" ? "ring-red-300" : "ring-black/5")} title={a.err ?? a.file.name}>
              {a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1.5 text-center text-[10px] font-bold text-ink/55">
                  <FileText size={22} className="text-[#1D4ED8]" />
                  <span className="line-clamp-2 break-all">{a.file.name}</span>
                </span>
              )}
              {a.status === "up" && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 size={22} className="animate-spin text-[#1D4ED8]" />
                </span>
              )}
              {a.status === "err" && <span className="absolute inset-x-0 bottom-0 bg-red-600 px-1 py-0.5 text-center text-[9px] font-bold text-white">{km ? "បរាជ័យ" : "Failed"}</span>}
              <button type="button" onClick={() => remove(a.key)} aria-label="remove" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {menu && (
        <div className="absolute bottom-full left-3 z-20 mb-2 grid w-60 animate-[gwzPop_.18s_ease-out_both] gap-0.5 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-black/5">
          <button type="button" className={pickBtn} onClick={() => gallery.current?.click()}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><ImageIcon size={18} /></span>
            {km ? "រូបភាព / វីដេអូ" : "Photos / videos"}
          </button>
          <button type="button" className={pickBtn} onClick={() => camera.current?.click()}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600"><Camera size={18} /></span>
            {km ? "ថតរូប" : "Take a photo"}
          </button>
          <button type="button" className={pickBtn} onClick={() => anyFile.current?.click()}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Paperclip size={18} /></span>
            {km ? "ឯកសារ (PDF, Word, Excel…)" : "File (PDF, Word, Excel…)"}
          </button>
          <button type="button" className={pickBtn} onClick={shareLocation}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600"><MapPin size={18} /></span>
            {km ? "ទីតាំងរបស់ខ្ញុំ" : "My location"}
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setMenu(!menu)}
          disabled={!online}
          aria-label={km ? "ភ្ជាប់រូប ឬឯកសារ" : "Attach"}
          title={km ? "រូបភាព ឯកសារ ទីតាំង" : "Photos, files, location"}
          className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8] transition hover:bg-[#DBEAFE] active:scale-90 disabled:opacity-50", menu && "rotate-45 bg-[#DBEAFE]")}
        >
          <Plus size={22} />
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
              submit();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.length) {
              e.preventDefault();
              add(files);
            }
          }}
          onFocus={() => setMenu(false)}
          onInput={(e) => {
            grow(e.currentTarget);
            setHasText(e.currentTarget.value.trim().length > 0);
            onTyping?.();
          }}
          // 16px text: smaller makes iPhones zoom in (and shake) when you tap the box
          className="block max-h-[132px] min-h-[48px] min-w-0 flex-1 resize-none overflow-y-hidden rounded-3xl border border-black/10 bg-[#F8FAFF] px-4 py-3 text-base leading-6 text-ink outline-none transition-[border-color,background-color] focus:border-[#2563EB] focus:bg-white"
        />
        {canSend || !online ? (
          <button type="submit" disabled={uploading} aria-label="send" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white shadow-soft transition active:scale-90 disabled:opacity-60">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <SendHorizonal size={20} />}
          </button>
        ) : (
          <button type="button" onClick={start} disabled={sending} aria-label={km ? "ថតសំឡេង" : "Record voice"} title={km ? "ថតសំឡេង" : "Voice message"} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white shadow-soft transition active:scale-90 disabled:opacity-60">
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </form>
  );
}
