"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Heart, Share2, Volume2, VolumeX, Loader2, Send, Radio, Copy, Check, MessageCircle, MapPin } from "lucide-react";
import { startViewer, type LiveState } from "@/lib/live-net";
import { CommentRow, fmtCount, useHearts, useLiveComments, type LiveComment } from "./LiveBits";
import { cn } from "@/lib/utils/cn";

type Props = {
  id: string;
  title: string;
  place: string | null;
  likes: number;
  viewers: number;
  onAir: boolean;
  comments: LiveComment[];
  ice: RTCIceServer[];
  km: boolean;
  signedIn: boolean;
};

/** Watching a live video: picture, viewers, hearts, comments and share. */
export function LiveWatch(p: Props) {
  const { km } = p;
  const video = useRef<HTMLVideoElement>(null);
  const net = useRef<ReturnType<typeof startViewer> | null>(null);
  const [state, setState] = useState<LiveState>(p.onAir ? "waiting" : "ended");
  const [viewers, setViewers] = useState(p.viewers);
  const [likes, setLikes] = useState(p.likes);
  const [muted, setMuted] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { list, hide } = useLiveComments(p.id, p.comments);
  const { pop, layer } = useHearts();
  const pendingLikes = useRef(0);
  const feedEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!p.onAir) return;
    net.current = startViewer(p.id, p.ice, {
      onState: setState,
      onViewers: setViewers,
      onStream: (s) => {
        if (video.current && video.current.srcObject !== s) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      },
      onHeart: (n) => {
        setLikes((x) => x + n);
        pop(n);
      },
      onHide: hide,
    });
    return () => {
      net.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id, p.onAir]);
  // hearts are counted on the server in small batches
  useEffect(() => {
    const id = setInterval(() => {
      const n = pendingLikes.current;
      if (!n) return;
      pendingLikes.current = 0;
      fetch(`/api/live/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like", n }) }).catch(() => {});
    }, 2500);
    return () => clearInterval(id);
  }, [p.id]);
  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end" }); // (newer browsers return a Promise here: never hand it to React)
  }, [list.length]);

  const heart = () => {
    pendingLikes.current++;
    setLikes((x) => x + 1);
    pop(1);
    net.current?.heart(1);
    navigator.vibrate?.(10);
  };
  const unmute = () => {
    if (!video.current) return;
    video.current.muted = !muted;
    video.current.play().catch(() => {});
    setMuted(!muted);
  };
  const comment = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setErr("");
    const r = await fetch(`/api/live/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", body }) }).catch(() => null);
    setSending(false);
    if (r?.ok) setText("");
    else setErr(r?.status === 429 ? (km ? "សូមរង់ចាំបន្តិច" : "Slow down a little") : km ? "ផ្ញើមិនបាន" : "Couldn't send");
  };
  const url = typeof window !== "undefined" ? `${location.origin}/live/${p.id}` : "";
  const share = async () => {
    if (navigator.share) return navigator.share({ title: `🔴 ${p.title} · Green Wild Zoo`, url }).catch(() => {});
    setShareOpen(true);
  };

  const status: Record<LiveState, string> = km
    ? { waiting: "កំពុងភ្ជាប់ទៅការផ្សាយ…", connecting: "កំពុងភ្ជាប់…", live: "", full: "មនុស្សមើលច្រើនពេក កំពុងព្យាយាមម្តងទៀត…", offair: "ការផ្សាយបានផ្អាកមួយភ្លែត…", ended: "ការផ្សាយផ្ទាល់បានបញ្ចប់" }
    : { waiting: "Joining the live…", connecting: "Connecting…", live: "", full: "Lots of viewers — trying again…", offair: "The live paused for a moment…", ended: "This live has ended" };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      {/* the picture */}
      <div className="relative overflow-hidden rounded-3xl bg-black shadow-lift">
        <div className="relative aspect-[9/14] max-h-[78vh] w-full sm:aspect-video">
          <video ref={video} autoPlay playsInline muted={muted} className="absolute inset-0 h-full w-full object-contain" />
          {state !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-900 to-black p-6 text-center text-white">
              {state === "ended" ? <Radio size={42} className="text-white/60" /> : <Loader2 size={40} className="animate-spin text-white/80" />}
              <p className="font-display text-xl font-extrabold">{status[state]}</p>
              {state === "ended" && (
                <Link href="/live" className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-black">
                  {km ? "មើលការផ្សាយផ្សេងទៀត" : "See other lives"}
                </Link>
              )}
            </div>
          )}
          {/* top bar */}
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-3 text-white">
            {state !== "ended" ? (
              <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-xs font-black tracking-wider"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE</span>
            ) : (
              <span className="rounded-md bg-white/20 px-2 py-1 text-xs font-bold">{km ? "បានបញ្ចប់" : "Ended"}</span>
            )}
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold"><Eye size={14} /> {fmtCount(viewers)}</span>
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold"><Heart size={14} className="fill-rose-500 text-rose-500" /> {fmtCount(likes)}</span>
          </div>
          {state === "live" && (
            <button type="button" onClick={unmute} className={cn("absolute left-3 top-14 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-white backdrop-blur", muted ? "animate-pulse bg-black/60" : "bg-black/40")}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {muted ? (km ? "ចុចដើម្បីបើកសំឡេង" : "Tap for sound") : ""}
            </button>
          )}
          {layer}
          {/* heart + share on the side, like on Facebook / TikTok */}
          <div className="absolute bottom-4 right-3 z-20 flex flex-col items-center gap-3">
            <button type="button" onClick={share} aria-label={km ? "ចែករំលែក" : "Share"} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-90">
              <Share2 size={20} />
            </button>
            <button type="button" onClick={heart} disabled={state === "ended"} aria-label={km ? "ចូលចិត្ត" : "Like"} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lift active:scale-90 disabled:opacity-50">
              <Heart size={26} className="fill-white" />
            </button>
          </div>
        </div>
        <div className="bg-white p-4">
          <h1 className="font-display text-xl font-extrabold text-forest">{p.title}</h1>
          {p.place && <p className="mt-0.5 flex items-center gap-1 text-sm text-ink/55"><MapPin size={14} /> {p.place}</p>}
        </div>
      </div>

      {/* comments */}
      <aside className="flex min-h-[20rem] flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 lg:max-h-[calc(78vh+4.5rem)]">
        <p className="flex items-center gap-2 border-b border-black/5 px-4 py-3 font-display font-extrabold text-forest"><MessageCircle size={18} /> {km ? "មតិយោបល់" : "Comments"} <span className="text-sm font-bold text-ink/40">{list.length}</span></p>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {list.length === 0 && <p className="text-sm text-ink/45">{km ? "ជាអ្នកដំបូងដែលបញ្ចេញមតិ!" : "Be the first to comment!"}</p>}
          {list.map((c) => <CommentRow key={c.id} c={c} />)}
          <div ref={feedEnd} />
        </div>
        {state !== "ended" &&
          (p.signedIn ? (
            <form onSubmit={comment} className="border-t border-black/5 p-3">
              {err && <p className="mb-2 text-xs font-bold text-red-600">{err}</p>}
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={km ? "សរសេរមតិ…" : "Write a comment…"} className="min-w-0 flex-1 rounded-full border border-black/10 bg-cream/60 px-4 py-2.5 text-base outline-none focus:border-primary" />
                <button disabled={sending || !text.trim()} aria-label="send" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50">
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          ) : (
            <Link href={`/account/login?next=/live/${p.id}`} className="m-3 rounded-full bg-primary py-3 text-center text-sm font-extrabold text-white">
              {km ? "ចូលគណនី ដើម្បីបញ្ចេញមតិ" : "Sign in to comment"}
            </Link>
          ))}
      </aside>

      {shareOpen && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 md:items-center" onClick={() => setShareOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
            <h3 className="font-display text-lg font-extrabold text-forest">{km ? "ចែករំលែកការផ្សាយ" : "Share this live"}</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-[#1877F2] p-3 text-white">Facebook</a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`🔴 ${p.title}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-[#229ED9] p-3 text-white">Telegram</a>
              <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))} className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 p-3 text-ink">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? (km ? "បានចម្លង" : "Copied") : km ? "ចម្លង link" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
