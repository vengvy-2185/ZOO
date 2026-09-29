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

  const camera = (face: "environment" | "user") =>
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await camera(facing.current);
        if (dead) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        net.current = startHost(p.id, s, p.ice, {
          onViewers: setViewers,
          onHeart: (n) => {
            setLikes((x) => x + n);
            pop(n);
          },
        });
        setReady(true);
      } catch {
        setErr(km ? "សូមអនុញ្ញាតឲ្យប្រើកាមេរ៉ា និងមីក្រូហ្វូន" : "Please allow the camera and microphone");
      }
    })();
    return () => {
      dead = true;
      net.current?.stop(false);
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

  const flip = async () => {
    facing.current = facing.current === "environment" ? "user" : "environment";
    try {
      // many phones can't open the second camera while the first is on: stop it first, keep the microphone
      stream.current?.getVideoTracks().forEach((t) => t.stop());
      const v = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25 } } });
      const s = new MediaStream([...(stream.current?.getAudioTracks() ?? []), ...v.getVideoTracks()]);
      stream.current = s;
      if (video.current) video.current.srcObject = s;
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
      <video ref={video} autoPlay playsInline muted className={cn("absolute inset-0 h-full w-full object-cover", facing.current === "user" && "-scale-x-100")} />
      {!ready && !err && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={40} className="animate-spin" />
        </div>
      )}
      {err && <p className="absolute inset-x-6 top-1/3 rounded-2xl bg-red-600 p-4 text-center font-bold">{err}</p>}

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
        <Btn label={km ? "ប្តូរកាមេរ៉ា" : "Flip"} onClick={flip}><SwitchCamera size={22} /></Btn>
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
