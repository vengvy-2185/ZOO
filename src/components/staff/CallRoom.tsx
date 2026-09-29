"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, SwitchCamera, Volume2, Loader2, ChevronLeft, Users } from "lucide-react";
import type { Person } from "@/lib/server/avatars";
import { freshRealtime } from "@/lib/supabase/realtime";
import { playSound, unlockSound } from "@/lib/client-sound";
import { cn } from "@/lib/utils/cn";

// Group calls straight between the phones (WebRTC, each person connected to
// each other person). The phones find each other through a live channel on
// Supabase that only carries the "how to connect" notes, never the voice.
// The call id is random and only given to people allowed in the room.

type Props = {
  callId: string;
  channel: string;
  room: string;
  /** a call to one person (not a whole room) */
  direct?: boolean;
  video: boolean;
  startedBy: string | null;
  me: string;
  people: Record<string, Person>;
  km: boolean;
  ended: boolean;
  autoStart: "voice" | "video" | null;
  ice: RTCIceServer[];
};
type Here = { session: string; user: string; mic: boolean; cam: boolean; joined: boolean };
type Peer = { pc: RTCPeerConnection; stream: MediaStream; ice: RTCIceCandidateInit[]; user: string };

const beat = (id: string, action: "alive" | "end"): Promise<{ ended?: boolean }> =>
  fetch("/api/staff/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }), keepalive: true })
    .then((r) => r.json())
    .catch(() => ({}));

export function CallRoom(p: Props) {
  const { km, me } = p;
  const router = useRouter();
  const [phase, setPhase] = useState<"lobby" | "joining" | "in" | "ended">(p.ended ? "ended" : "lobby");
  const [here, setHere] = useState<Here[]>([]);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0); // re-render when a connection changes
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [needTap, setNeedTap] = useState(false);
  const session = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));
  const chan = useRef<any>(null);
  const ready = useRef<{ p: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const pr = new Promise<void>((r) => (done = r));
    ready.current = { p: pr, done };
  }
  const local = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, Peer>());
  const joined = useRef(false);
  const facing = useRef<"user" | "environment">("user");
  const localVideo = useRef<HTMLVideoElement>(null);
  const bump = useCallback(() => setTick((x) => x + 1), []);
  const person = (u: string | null) => (u ? p.people[u] : undefined);
  const nameOf = (u: string | null) => (u === me ? (km ? "អ្នក" : "You") : person(u)?.name ?? "—");

  const send = (to: string, data: any) => chan.current?.send({ type: "broadcast", event: "sig", payload: { to, from: session.current, data } });
  const audioTrack = () => local.current?.getAudioTracks()[0] ?? null;
  const videoTrack = () => local.current?.getVideoTracks()[0] ?? null;

  const makePeer = (remote: string, user: string) => {
    const pc = new RTCPeerConnection({ iceServers: p.ice });
    const peer: Peer = { pc, stream: new MediaStream(), ice: [], user };
    pc.ontrack = (e) => {
      if (!peer.stream.getTracks().includes(e.track)) peer.stream.addTrack(e.track);
      e.track.onunmute = bump;
      bump();
    };
    pc.onicecandidate = (e) => e.candidate && send(remote, { type: "ice", c: e.candidate.toJSON() });
    let wobble: ReturnType<typeof setTimeout> | undefined;
    pc.onconnectionstatechange = () => {
      clearTimeout(wobble);
      if (pc.connectionState === "connected") setSince((s) => s ?? Date.now());
      // the network changed (wifi → 4G…) or dropped for a moment: connect again.
      // The one who called first makes the new offer; the other one asks for it.
      const again = () => (session.current < remote ? offer(remote, true) : send(remote, { type: "restart" }));
      if (pc.connectionState === "failed") again();
      if (pc.connectionState === "disconnected") wobble = setTimeout(() => pc.connectionState !== "connected" && again(), 3500);
      bump();
    };
    peers.current.set(remote, peer);
    return peer;
  };
  const offer = async (remote: string, restart = false) => {
    const peer = peers.current.get(remote);
    if (!peer) return;
    const offer = await peer.pc.createOffer({ iceRestart: restart });
    await peer.pc.setLocalDescription(offer);
    send(remote, { type: "offer", sdp: peer.pc.localDescription });
  };
  const call = async (remote: string, user: string) => {
    const peer = makePeer(remote, user);
    // an audio and a video lane from the start: the camera can go on later without starting over
    const a = peer.pc.addTransceiver("audio", { direction: "sendrecv" });
    const v = peer.pc.addTransceiver("video", { direction: "sendrecv" });
    await a.sender.replaceTrack(audioTrack());
    await v.sender.replaceTrack(videoTrack());
    await offer(remote);
  };
  const flush = async (peer: Peer) => {
    for (const c of peer.ice.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
  };
  const onSignal = async (from: string, data: any, user: string) => {
    if (!joined.current) return;
    let peer = peers.current.get(from);
    if (data.type === "offer") {
      const fresh = !peer;
      if (!peer) peer = makePeer(from, user);
      await peer.pc.setRemoteDescription(data.sdp);
      if (fresh)
        for (const t of peer.pc.getTransceivers()) {
          t.direction = "sendrecv";
          await t.sender.replaceTrack(t.receiver.track.kind === "audio" ? audioTrack() : videoTrack());
        }
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      send(from, { type: "answer", sdp: peer.pc.localDescription });
      await flush(peer);
    } else if (data.type === "answer" && peer) {
      await peer.pc.setRemoteDescription(data.sdp).catch(() => {});
      await flush(peer);
    } else if (data.type === "restart" && peer) {
      await offer(from, true);
    } else if (data.type === "ice" && peer) {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.c).catch(() => {});
      else peer.ice.push(data.c);
    }
  };
  const drop = (remote: string) => {
    const peer = peers.current.get(remote);
    if (!peer) return;
    peer.pc.close();
    peers.current.delete(remote);
    bump();
  };

  // the live channel: who is here (presence) and the connection notes
  const hereRef = useRef<Here[]>([]);
  useEffect(() => {
    if (p.ended) return;
    const sb = freshRealtime();
    const ch = sb.channel(`gwz-call-${p.callId}`, { config: { presence: { key: session.current }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const list: Here[] = Object.entries(state).map(([k, v]) => ({ session: k, user: v[0]?.user, mic: v[0]?.mic !== false, cam: !!v[0]?.cam, joined: !!v[0]?.joined }));
      hereRef.current = list;
      setHere(list);
      if (!joined.current) return;
      const others = list.filter((h) => h.session !== session.current && h.joined);
      // connect to newcomers (the lower id starts, so two people never both call)
      for (const h of others) if (!peers.current.has(h.session) && session.current < h.session) call(h.session, h.user);
      for (const s of [...peers.current.keys()]) if (!others.some((h) => h.session === s)) drop(s);
    });
    ch.on("broadcast", { event: "sig" }, ({ payload }: any) => {
      if (payload?.to !== session.current) return;
      const user = hereRef.current.find((h) => h.session === payload.from)?.user ?? "";
      onSignal(payload.from, payload.data, user);
    });
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        ch.track({ user: me, joined: false });
        ready.current?.done();
      }
    });
    chan.current = ch;
    return () => {
      sb.removeChannel(ch).finally(() => sb.realtime.disconnect());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.callId, p.ended]);

  const getMedia = async (wantVideo: boolean) => {
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    try {
      return await navigator.mediaDevices.getUserMedia({ audio, video: wantVideo ? { facingMode: facing.current, width: { ideal: 640 }, height: { ideal: 480 } } : false });
    } catch (e) {
      if (!wantVideo) throw e;
      return navigator.mediaDevices.getUserMedia({ audio }); // no camera: still join with voice
    }
  };

  const join = async (wantVideo: boolean) => {
    setErr("");
    setPhase("joining");
    try {
      local.current = await getMedia(wantVideo);
    } catch {
      setErr(km ? "សូមអនុញ្ញាតឲ្យប្រើមីក្រូហ្វូន ដើម្បីចូលរួមការហៅ" : "Please allow the microphone to join the call");
      setPhase("lobby");
      return;
    }
    const hasCam = !!videoTrack();
    setCam(hasCam);
    setMic(true);
    await Promise.race([ready.current?.p, new Promise((r) => setTimeout(r, 8000))]);
    joined.current = true;
    setPhase("in");
    await chan.current?.track({ user: me, joined: true, mic: true, cam: hasCam });
    beat(p.callId, "alive");
    // anyone already in the call: connect now
    for (const h of hereRef.current) if (h.joined && h.session !== session.current && !peers.current.has(h.session) && session.current < h.session) call(h.session, h.user);
  };

  // the one who called joins straight away
  const started = useRef(false);
  useEffect(() => {
    if (!p.autoStart || started.current) return;
    started.current = true;
    join(p.autoStart === "video"); // waits for the live channel by itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const others = here.filter((h) => h.joined && h.session !== session.current);
  const othersRef = useRef(0);
  othersRef.current = others.length;
  const everHadSomeone = useRef(false);
  if (others.length) everHadSomeone.current = true;

  // "still here" every 20 s; ringing alone for a minute = no answer
  useEffect(() => {
    if (phase !== "in") return;
    const id = setInterval(() => {
      beat(p.callId, "alive").then((r) => {
        if (r.ended && (othersRef.current === 0 || p.direct)) leave(p.direct && !everHadSomeone.current ? (km ? "គាត់មិនអាចទទួលបានទេ" : "They couldn't answer") : km ? "ការហៅបានបញ្ចប់" : "The call has ended");
      });
      setNow(Date.now());
    }, othersRef.current ? 20000 : 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, p.callId, others.length > 0]);
  // the one calling hears a waiting tone until someone answers
  const waiting = phase === "in" && others.length === 0 && p.startedBy === me && !everHadSomeone.current;
  useEffect(() => {
    if (!waiting) return;
    unlockSound();
    playSound("ringback", 0.35);
    const id = setInterval(() => playSound("ringback", 0.35), 3000);
    return () => clearInterval(id);
  }, [waiting]);
  // keep the screen on during a call
  useEffect(() => {
    if (phase !== "in") return;
    let lock: any = null;
    const get = () => (navigator as any).wakeLock?.request("screen").then((l: any) => (lock = l)).catch(() => {});
    get();
    const again = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release?.().catch?.(() => {});
    };
  }, [phase]);
  const [joinedAt] = useState(() => Date.now());
  useEffect(() => {
    if (phase === "in" && !everHadSomeone.current && now - joinedAt > 60000 && p.startedBy === me) leave(km ? "គ្មាននរណាឆ្លើយ" : "No answer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const cleanup = () => {
    for (const s of [...peers.current.keys()]) drop(s);
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    joined.current = false;
  };
  const leave = async (why?: string) => {
    // a call to one person ends when either of the two hangs up; a room call when the last one leaves
    const alone = othersRef.current === 0 || Boolean(p.direct);
    cleanup();
    await chan.current?.untrack?.();
    if (alone) await beat(p.callId, "end");
    if (why) {
      setErr(why);
      setPhase("ended");
      return;
    }
    router.push(`/staff/chat?c=${p.channel}`);
    router.refresh();
  };
  // closing the page: hang up properly
  useEffect(() => {
    const bye = () => {
      if (!joined.current) return;
      navigator.sendBeacon?.("/api/staff/call", new Blob([JSON.stringify({ id: p.callId, action: othersRef.current === 0 || p.direct ? "end" : "alive" })], { type: "application/json" }));
      cleanup();
    };
    addEventListener("pagehide", bye);
    return () => {
      removeEventListener("pagehide", bye);
      bye();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.callId]);

  const toggleMic = () => {
    const t = audioTrack();
    if (!t) return;
    t.enabled = !t.enabled;
    setMic(t.enabled);
    chan.current?.track({ user: me, joined: true, mic: t.enabled, cam });
  };
  const setVideo = async (track: MediaStreamTrack | null) => {
    for (const peer of peers.current.values()) {
      const v = peer.pc.getTransceivers().find((t) => t.receiver.track.kind === "video");
      await v?.sender.replaceTrack(track).catch(() => {});
    }
  };
  const toggleCam = async () => {
    const cur = videoTrack();
    if (cur) {
      cur.stop();
      local.current?.removeTrack(cur);
      await setVideo(null);
      setCam(false);
      chan.current?.track({ user: me, joined: true, mic, cam: false });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current, width: { ideal: 640 }, height: { ideal: 480 } } });
      const t = s.getVideoTracks()[0];
      local.current?.addTrack(t);
      await setVideo(t);
      setCam(true);
      chan.current?.track({ user: me, joined: true, mic, cam: true });
    } catch {
      setErr(km ? "សូមអនុញ្ញាតឲ្យប្រើកាមេរ៉ា" : "Please allow the camera");
    }
  };
  const flip = async () => {
    facing.current = facing.current === "user" ? "environment" : "user";
    const old = videoTrack();
    if (!old) return;
    old.stop();
    local.current?.removeTrack(old);
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current } }).catch(() => null);
    const t = s?.getVideoTracks()[0] ?? null;
    if (t) local.current?.addTrack(t);
    await setVideo(t);
    bump();
  };

  useEffect(() => {
    if (localVideo.current && local.current) localVideo.current.srcObject = local.current;
  }, [cam, phase, tick]);

  const secs = since ? Math.floor((now - since) / 1000) : 0;
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const starter = nameOf(p.startedBy);

  // ── screens ──
  if (phase === "ended")
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><PhoneOff size={34} /></span>
          <h1 className="font-display text-2xl font-extrabold">{err || (km ? "ការហៅបានបញ្ចប់" : "The call has ended")}</h1>
          <p className="text-white/60">{p.room}</p>
          <button type="button" onClick={() => router.push(`/staff/chat?c=${p.channel}`)} className="mt-2 rounded-full bg-white px-6 py-3 font-extrabold text-slate-900">{km ? "ត្រឡប់ទៅការជជែក" : "Back to the chat"}</button>
        </div>
      </Screen>
    );

  if (phase !== "in")
    return (
      <Screen>
        <div className="flex items-center gap-2 p-3">
          <button type="button" onClick={() => router.push(`/staff/chat?c=${p.channel}`)} aria-label="back" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"><ChevronLeft size={24} /></button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <span className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            <Face p={person(p.startedBy)} size={112} />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-white/50">{p.video ? (km ? "ការហៅជាវីដេអូ" : "Video call") : km ? "ការហៅជាសំឡេង" : "Voice call"} · {p.room}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">{starter}</h1>
            <p className="mt-1 text-white/60">{p.direct ? (km ? "កំពុងហៅអ្នក…" : "is calling you…") : km ? "កំពុងហៅក្រុម…" : "is calling the team…"}</p>
          </div>
          {others.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex -space-x-2">{others.slice(0, 6).map((h) => <Face key={h.session} p={person(h.user)} size={36} />)}</div>
              <p className="flex items-center gap-1.5 text-sm text-white/60"><Users size={14} /> {km ? `${others.length} នាក់កំពុងនិយាយ` : `${others.length} in the call`}</p>
            </div>
          )}
          {err && <p className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-bold text-red-200">{err}</p>}
          <div className="mt-4 flex items-center gap-8">
            <RoundBtn label={km ? "ចូលរួមជាសំឡេង" : "Join with voice"} onClick={() => join(false)} className="bg-emerald-500 hover:bg-emerald-400" busy={phase === "joining"}>
              <Phone size={28} />
            </RoundBtn>
            <RoundBtn label={km ? "ចូលរួមជាវីដេអូ" : "Join with video"} onClick={() => join(true)} className="bg-[#2563EB] hover:bg-[#3B82F6]" busy={phase === "joining"}>
              <Video size={28} />
            </RoundBtn>
          </div>
        </div>
      </Screen>
    );

  const tiles = others.map((h) => ({ h, peer: peers.current.get(h.session) }));
  return (
    <Screen>
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold">{p.room}</p>
          <p className="text-sm text-white/60">{others.length === 0 ? (km ? "កំពុងហៅ… រង់ចាំអ្នកផ្សេងចូលរួម" : "Calling… waiting for others") : since ? clock : km ? "កំពុងភ្ជាប់…" : "Connecting…"}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold"><Users size={15} /> {others.length + 1}</span>
      </div>

      <div className={cn("grid min-h-0 flex-1 gap-2 p-2", tiles.length <= 1 ? "grid-cols-1" : tiles.length <= 4 ? "grid-cols-2" : "grid-cols-3")}>
        {tiles.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <span className="relative"><span className="absolute inset-0 animate-ping rounded-full bg-white/20" /><Face p={person(me)} size={96} /></span>
            <p className="text-white/60">{p.direct ? (km ? `កំពុងរោទ៍ទៅ ${p.room}…` : `Ringing ${p.room}…`) : km ? "បានផ្ញើការជូនដំណឹងទៅទូរស័ព្ទក្រុមហើយ" : "The team's phones are ringing"}</p>
          </div>
        )}
        {tiles.map(({ h, peer }) => (
          <Tile key={h.session} h={h} stream={peer?.stream ?? null} state={peer?.pc.connectionState ?? "new"} person={person(h.user)} name={nameOf(h.user)} km={km} tick={tick} onBlocked={() => setNeedTap(true)} />
        ))}
      </div>

      {cam && (
        <video ref={localVideo} autoPlay playsInline muted className={cn("absolute bottom-28 right-3 z-10 h-40 w-28 rounded-2xl bg-black object-cover shadow-lift ring-2 ring-white/30 sm:h-48 sm:w-36", facing.current === "user" && "-scale-x-100")} />
      )}
      {needTap && (
        <button type="button" onClick={() => { document.querySelectorAll<HTMLAudioElement>("audio[data-call]").forEach((a) => a.play().catch(() => {})); setNeedTap(false); }} className="absolute left-1/2 top-20 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 font-extrabold text-slate-900 shadow-lift">
          <Volume2 size={18} /> {km ? "ចុចដើម្បីឮសំឡេង" : "Tap to hear"}
        </button>
      )}
      {err && <p className="mx-4 rounded-xl bg-red-500/20 px-4 py-2 text-center text-sm font-bold text-red-200">{err}</p>}

      <div className="flex items-center justify-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <RoundBtn label={mic ? (km ? "បិទមីក្រូ" : "Mute") : km ? "បើកមីក្រូ" : "Unmute"} onClick={toggleMic} className={mic ? "bg-white/15 hover:bg-white/25" : "bg-white text-slate-900"} small>
          {mic ? <Mic size={24} /> : <MicOff size={24} />}
        </RoundBtn>
        <RoundBtn label={cam ? (km ? "បិទកាមេរ៉ា" : "Camera off") : km ? "បើកកាមេរ៉ា" : "Camera on"} onClick={toggleCam} className={cam ? "bg-white/15 hover:bg-white/25" : "bg-white/15 hover:bg-white/25 text-white/70"} small>
          {cam ? <Video size={24} /> : <VideoOff size={24} />}
        </RoundBtn>
        {cam && (
          <RoundBtn label={km ? "ប្តូរកាមេរ៉ា" : "Switch camera"} onClick={flip} className="bg-white/15 hover:bg-white/25" small>
            <SwitchCamera size={24} />
          </RoundBtn>
        )}
        <RoundBtn label={km ? "ចាកចេញ" : "Leave"} onClick={() => leave()} className="bg-red-600 hover:bg-red-500" small>
          <PhoneOff size={24} />
        </RoundBtn>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[90] flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">{children}</div>;
}

function Face({ p, size }: { p: Person | undefined; size: number }) {
  return (
    <span className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1D4ED8] font-extrabold text-white ring-4 ring-white/10" style={{ width: size, height: size, fontSize: size / 2.6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p?.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...(p?.name ?? "?")][0]?.toUpperCase()}
    </span>
  );
}

function RoundBtn({ label, onClick, className, children, small, busy }: { label: string; onClick: () => void; className?: string; children: React.ReactNode; small?: boolean; busy?: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} disabled={busy} aria-label={label} title={label} className={cn("flex items-center justify-center rounded-full text-white shadow-lift transition active:scale-90 disabled:opacity-60", small ? "h-14 w-14" : "h-[72px] w-[72px]", className)}>
        {busy ? <Loader2 size={26} className="animate-spin" /> : children}
      </button>
      <span className="max-w-[5.5rem] text-center text-[11px] font-semibold text-white/60">{label}</span>
    </span>
  );
}

/** One person in the call: their camera, or their photo with a ring while they talk. */
function Tile({ h, stream, state, person, name, km, tick, onBlocked }: { h: Here; stream: MediaStream | null; state: string; person: Person | undefined; name: string; km: boolean; tick: number; onBlocked: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [talking, setTalking] = useState(false);
  useEffect(() => {
    if (audio.current && stream && audio.current.srcObject !== stream) {
      audio.current.srcObject = stream;
      audio.current.play().catch(onBlocked);
    }
    if (video.current && stream && video.current.srcObject !== stream) video.current.srcObject = stream;
  }, [stream, tick, h.cam, onBlocked]);
  // a green ring while this person is talking
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let last = 0;
      const loop = (t: number) => {
        if (t - last > 150) {
          last = t;
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          setTalking(peak > 12);
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } catch {
      /* no sound meter */
    }
    return () => {
      cancelAnimationFrame(raf);
      ctx?.close().catch(() => {});
    };
  }, [stream, tick]);
  const showVideo = h.cam && !!stream?.getVideoTracks().length;
  return (
    <div className={cn("relative flex min-h-0 items-center justify-center overflow-hidden rounded-3xl bg-white/5 ring-2 transition", talking && h.mic ? "ring-emerald-400" : "ring-transparent")}>
      <audio ref={audio} autoPlay data-call />
      {showVideo ? <video ref={video} autoPlay playsInline muted className="h-full w-full object-cover" /> : <Face p={person} size={88} />}
      <span className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-bold backdrop-blur">
        {!h.mic && <MicOff size={14} className="text-red-300" />}
        <span className="truncate">{name}</span>
      </span>
      {state !== "connected" && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold">
          <Loader2 size={12} className="animate-spin" /> {state === "failed" ? (km ? "ភ្ជាប់មិនបាន…" : "Can't connect…") : km ? "កំពុងភ្ជាប់" : "Connecting"}
        </span>
      )}
    </div>
  );
}
