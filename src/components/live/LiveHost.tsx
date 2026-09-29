"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Heart, MessageCircle, SwitchCamera, Mic, MicOff, Square, Loader2, Share2 } from "lucide-react";
import { startHost } from "@/lib/live-net";
import { endLive, hideLiveComment } from "@/app/staff/(protected)/live/actions";
import { CommentRow, fmtCount, useHearts, useLiveComments, type LiveComment } from "./LiveBits";
import { cn } from "@/lib/utils/cn";

type Props = { id: string; title: string; place: string | null; likes: number; startedAt: string; comments: LiveComment[]; ice: RTCIceServer[]; km: boolean };

/** The staff phone filming live: camera full screen, viewers, hearts and comments on top. */
export function LiveHost(p: Props) {
  const { km } = p;
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const net = useRef<ReturnType<typeof startHost> | null>(null);
  const facing = useRef<"environment" | "user">("environment");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(p.likes);
  const [mic, setMic] = useState(true);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(() => Date.parse(p.startedAt)); // same on server and phone; the clock ticks after
  const { list, hide } = useLiveComments(p.id, p.comments);
  const { pop, layer } = useHearts();
  const viewersRef = useRef(0);
  viewersRef.current = viewers;
  const feedEnd = useRef<HTMLDivElement>(null);

  const [problem, setProblem] = useState<"" | "blocked" | "busy" | "none" | "other">("");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [camIdx, setCamIdx] = useState(0);
  const [mirror, setMirror] = useState(false);
  const [noMic, setNoMic] = useState(false);
  const phone = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } };
  const AUDIO = { echoCancellation: true, noiseSuppression: true };

  /** Opens a camera, trying simpler ways when the first one fails (laptops, busy microphones…). */
  const openMedia = async (deviceId?: string) => {
    const video: MediaTrackConstraints = deviceId ? { ...VIDEO, deviceId: { exact: deviceId } } : phone ? { ...VIDEO, facingMode: facing.current } : VIDEO;
    const tries: MediaStreamConstraints[] = [{ video, audio: AUDIO }, { video: true, audio: true }, { video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false }];
    let last: any = null;
    for (const c of tries) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        setNoMic(!s.getAudioTracks().length);
        return s;
      } catch (e: any) {
        last = e;
        if (e?.name === "NotAllowedError" || e?.name === "SecurityError") break; // asking again won't help
      }
    }
    throw last;
  };
  const stopping = useRef(false);
  const show = (s: MediaStream) => {
    stream.current = s;
    // the camera stopped by itself (driver hiccup, cable, another app): open it again
    s.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (stopping.current || stream.current !== s) return;
      setTimeout(async () => {
        try {
          const id = s.getVideoTracks()[0]?.getSettings?.().deviceId;
          const v = await navigator.mediaDevices.getUserMedia({ video: id ? { ...VIDEO, deviceId: { ideal: id } } : VIDEO });
          const again = new MediaStream([...s.getAudioTracks(), ...v.getVideoTracks()]);
          show(again);
          net.current?.setStream(again);
        } catch {
          setErr(km ? "កាមេរ៉ាបានឈប់ · ចុច «ប្តូរកាមេរ៉ា» ឬចាប់ផ្តើមម្តងទៀត" : "The camera stopped · press flip or start again");
        }
      }, 600);
    });
    if (video.current) video.current.srcObject = s;
    const set = s.getVideoTracks()[0]?.getSettings?.() ?? {};
    // the picture of a front camera is shown like a mirror (as people expect)
    setMirror(set.facingMode ? set.facingMode === "user" : !phone);
  };
  const start = async () => {
    setErr("");
    setProblem("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no media"), { name: "NotFoundError" });
      const s = await openMedia();
      show(s);
      const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setCams(list);
      const cur = s.getVideoTracks()[0]?.getSettings?.().deviceId;
      setCamIdx(Math.max(0, list.findIndex((d) => d.deviceId === cur)));
      if (!net.current)
        net.current = startHost(p.id, s, p.ice, {
          onViewers: setViewers,
          onHeart: (n) => {
            setLikes((x) => x + n);
            pop(n);
          },
        });
      else net.current.setStream(s);
      setReady(true);
    } catch (e: any) {
      const name = e?.name ?? "";
      setProblem(
        name === "NotAllowedError" || name === "SecurityError"
          ? "blocked"
          : name === "NotReadableError" || name === "AbortError" || name === "TrackStartError"
            ? "busy"
            : name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError"
              ? "none"
              : "other"
      );
      setErr(`${name || "Error"}${e?.message ? `: ${e.message}` : ""}`);
    }
  };

  useEffect(() => {
    start();
    return () => {
      stopping.current = true;
      net.current?.stop(false);
      net.current = null;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  // "still on air" + how many watch, every 15 s; keep the screen on
  useEffect(() => {
    if (!ready) return;
    const beat = () => fetch(`/api/live/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "alive", viewers: viewersRef.current }) }).catch(() => {});
    beat();
    const id = setInterval(beat, 15000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    let lock: any = null;
    (navigator as any).wakeLock?.request("screen").then((l: any) => (lock = l)).catch(() => {});
    return () => {
      clearInterval(id);
      clearInterval(clock);
      lock?.release?.().catch?.(() => {});
    };
  }, [ready, p.id]);
  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end" }); // (newer browsers return a Promise here: never hand it to React)
  }, [list.length]);

  /** Next camera: front / back on a phone, or the next webcam on a computer. */
  const flip = async () => {
    try {
      // many phones can't open the second camera while the first is on: stop it first, keep the microphone
      const old = stream.current;
      stream.current = null; // (so the "camera stopped by itself" guard stays quiet)
      old?.getVideoTracks().forEach((t) => t.stop());
      stream.current = old;
      let v: MediaStream;
      if (cams.length > 1) {
        const next = (camIdx + 1) % cams.length;
        v = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, deviceId: { exact: cams[next].deviceId } } });
        setCamIdx(next);
      } else {
        facing.current = facing.current === "environment" ? "user" : "environment";
        v = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, facingMode: facing.current } });
      }
      const s = new MediaStream([...(stream.current?.getAudioTracks() ?? []), ...v.getVideoTracks()]);
      show(s);
      net.current?.setStream(s);
    } catch {
      setErr(km ? "ប្តូរកាមេរ៉ាមិនបាន" : "Couldn't switch camera");
    }
  };
  const toggleMic = () => {
    const on = !mic;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    setMic(on);
  };
  const end = async () => {
    if (!confirm(km ? "បញ្ចប់ការផ្សាយផ្ទាល់?" : "End the live?")) return;
    setEnding(true);
    stopping.current = true;
    await net.current?.stop(true);
    net.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    await endLive(p.id);
    router.push(`/staff/live?ended=${p.id}`);
  };
  const share = () => {
    const url = `${location.origin}/live/${p.id}`;
    if (navigator.share) navigator.share({ title: p.title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => alert(km ? "បានចម្លង link" : "Link copied"));
  };

  const secs = Math.max(0, Math.floor((now - Date.parse(p.startedAt)) / 1000));
  const clock = `${Math.floor(secs / 3600) ? `${Math.floor(secs / 3600)}:` : ""}${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white">
      <video ref={video} autoPlay playsInline muted className={cn("absolute inset-0 h-full w-full object-cover md:object-contain", mirror && "-scale-x-100")} />
      {!ready && !problem && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-sm text-white/70">{km ? "កំពុងបើកកាមេរ៉ា… បើ browser សួរ សូមចុច «Allow»" : "Opening the camera… if the browser asks, press “Allow”"}</p>
        </div>
      )}
      {problem && <CameraProblem problem={problem} detail={err} km={km} onBack={() => router.push("/staff/live")} onRetry={start} />}
      {ready && err && <p className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold">{err}</p>}
      {noMic && ready && <p className="absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold">{km ? "គ្មានមីក្រូហ្វូន · ផ្សាយតែរូបភាព" : "No microphone · picture only"}</p>}

      {/* top: LIVE · time · viewers · hearts */}
      <div className="absolute inset-x-0 top-0 flex items-start gap-2 bg-gradient-to-b from-black/60 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-xs font-black tracking-wider">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
        </span>
        <span className="rounded-md bg-black/50 px-2 py-1 font-mono text-xs font-bold">{clock}</span>
        <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold"><Eye size={14} /> {fmtCount(viewers)}</span>
        <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold"><Heart size={14} className="fill-rose-500 text-rose-500" /> {fmtCount(likes)}</span>
        <span className="ml-auto max-w-[40%] truncate text-right text-sm font-bold drop-shadow">{p.title}</span>
      </div>

      {layer}

      {/* comments over the video */}
      <div className="no-scrollbar absolute bottom-24 left-0 max-h-[40vh] w-[78%] space-y-2 overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,transparent,black_20%)] md:w-96">
        {list.length === 0 && <p className="flex items-center gap-1.5 text-sm text-white/70 drop-shadow"><MessageCircle size={15} /> {km ? "មតិយោបល់នឹងលេចនៅទីនេះ" : "Comments will show here"}</p>}
        {list.map((c) => (
          <CommentRow
            key={c.id}
            c={c}
            dark
            hideLabel={km ? "លាក់មតិនេះ" : "Hide this comment"}
            onHide={() => {
              hide(c.id);
              net.current?.hide(c.id);
              hideLiveComment(c.id);
            }}
          />
        ))}
        <div ref={feedEnd} />
      </div>

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {(phone || cams.length > 1) && <Btn label={km ? "ប្តូរកាមេរ៉ា" : "Flip"} onClick={flip}><SwitchCamera size={22} /></Btn>}
        <Btn label={mic ? (km ? "បិទមីក្រូ" : "Mute") : km ? "បើកមីក្រូ" : "Unmute"} onClick={toggleMic} on={!mic}>{mic ? <Mic size={22} /> : <MicOff size={22} />}</Btn>
        <Btn label={km ? "ចែករំលែក" : "Share"} onClick={share}><Share2 size={22} /></Btn>
        <button type="button" onClick={end} disabled={ending} className="flex h-14 items-center gap-2 rounded-full bg-red-600 px-6 font-extrabold shadow-lift active:scale-95 disabled:opacity-60">
          {ending ? <Loader2 size={20} className="animate-spin" /> : <Square size={18} className="fill-white" />} {km ? "បញ្ចប់" : "End"}
        </button>
      </div>
    </div>
  );
}

function Btn({ label, onClick, children, on }: { label: string; onClick: () => void; children: React.ReactNode; on?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition active:scale-90", on ? "bg-white text-black" : "bg-white/20 hover:bg-white/30")}>
      {children}
    </button>
  );
}

const PROBLEM = {
  blocked: {
    icon: "🔒",
    km: ["Browser បានបិទកាមេរ៉ា", "ចុចរូប 🔒 ឬ 📷 នៅខាងឆ្វេង address bar → Camera និង Microphone → «Allow» (អនុញ្ញាត) រួចចុច «សាកម្តងទៀត»។ នៅលើ Windows ក៏ពិនិត្យ Settings → Privacy → Camera ផងដែរ។"],
    en: ["The browser blocked the camera", "Click the 🔒 or 📷 icon left of the address bar → Camera and Microphone → Allow, then press Try again. On Windows also check Settings → Privacy → Camera."],
  },
  busy: {
    icon: "📷",
    km: ["កាមេរ៉ាកំពុងប្រើដោយកម្មវិធីផ្សេង", "បិទ Zoom / Teams / Messenger / Camera app ឬ tab ផ្សេងដែលកំពុងប្រើកាមេរ៉ា ហើយចុច «សាកម្តងទៀត»។"],
    en: ["Another app is using the camera", "Close Zoom / Teams / Messenger / the Camera app or other tabs using the camera, then press Try again."],
  },
  none: {
    icon: "🚫",
    km: ["រកមិនឃើញកាមេរ៉ា", "ភ្ជាប់ webcam ឬប្រើទូរស័ព្ទដើម្បីផ្សាយផ្ទាល់។"],
    en: ["No camera found", "Plug in a webcam, or go live from a phone."],
  },
  other: {
    icon: "⚠️",
    km: ["បើកកាមេរ៉ាមិនបាន", "សូមសាកម្តងទៀត ឬប្រើ Chrome ថ្មី។"],
    en: ["Couldn't open the camera", "Please try again, or use an up-to-date Chrome."],
  },
};

/** Why the camera didn't open, what to do, and a Try again button. */
function CameraProblem({ problem, detail, km, onBack, onRetry }: { problem: keyof typeof PROBLEM; detail: string; km: boolean; onBack: () => void; onRetry: () => void }) {
  const x = PROBLEM[problem];
  const [title, text] = km ? x.km : x.en;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-slate-900">
        <p className="text-4xl">{x.icon}</p>
        <h2 className="mt-2 font-display text-xl font-extrabold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{detail}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onBack} className="rounded-2xl bg-slate-100 py-3 font-bold">{km ? "ត្រឡប់ក្រោយ" : "Back"}</button>
          <button type="button" onClick={onRetry} className="rounded-2xl bg-red-600 py-3 font-extrabold text-white">{km ? "សាកម្តងទៀត" : "Try again"}</button>
        </div>
      </div>
    </div>
  );
}
