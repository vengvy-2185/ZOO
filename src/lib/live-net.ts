"use client";

import { createClient } from "@/lib/supabase/client";

// Live video without a video server: the host's phone sends to a few viewers,
// and viewers on a good connection pass it on to a couple more (a tree), so
// the host's phone never has to send to everyone. The host decides who gets
// the video from whom. Phones find each other through a Supabase live
// channel that only carries these small notes, never the video.

const HOST_CAP = 4; // viewers fed straight from the host's phone
const RELAY_CAP = 2; // viewers each good viewer passes it on to
const VIDEO_KBPS = 900;

export type LiveState = "waiting" | "connecting" | "live" | "full" | "offair" | "ended";
type Events = {
  onViewers?: (n: number) => void;
  onHeart?: (n: number) => void;
  onHide?: (commentId: string) => void;
  onStream?: (s: MediaStream) => void;
  onState?: (s: LiveState) => void;
};

/** Waits (max 2.5 s) until the connection knows all its addresses, so they go in one message. */
function gathered(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((done) => {
    const t = setTimeout(done, 2500);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        done();
      }
    });
  });
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(".", ""));

/** Only viewers on Wi-Fi / a computer pass the video on (never on 2G/3G or data saver). */
function goodRelay() {
  const c: any = (navigator as any).connection;
  if (!c) return true;
  return !c.saveData && c.type !== "cellular" && !/(^|-)2g|3g/.test(String(c.effectiveType ?? ""));
}

function limit(pc: RTCPeerConnection) {
  for (const s of pc.getSenders()) {
    if (s.track?.kind !== "video") continue;
    try {
      const p = s.getParameters();
      p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].maxBitrate = VIDEO_KBPS * 1000;
      p.encodings[0].maxFramerate = 25;
      s.setParameters(p).catch(() => {});
    } catch {
      /* browser without sender limits */
    }
  }
}

function channel(streamId: string, me: string, role: "host" | "viewer") {
  const sb = createClient();
  const ch = sb.channel(`gwz-live-${streamId}`, { config: { presence: { key: me }, broadcast: { self: false } } });
  return { sb, ch, role };
}

/** Everything about the video going down to the people this phone feeds. */
function feeder(me: string, ice: RTCIceServer[], send: (event: string, payload: any) => void) {
  const outs = new Map<string, { pc: RTCPeerConnection; ice: RTCIceCandidateInit[] }>();
  let tracks: { audio: MediaStreamTrack | null; video: MediaStreamTrack | null } = { audio: null, video: null };
  const close = (child: string) => {
    outs.get(child)?.pc.close();
    outs.delete(child);
  };
  const open = async (child: string) => {
    close(child);
    const pc = new RTCPeerConnection({ iceServers: ice });
    const entry = { pc, ice: [] as RTCIceCandidateInit[] };
    outs.set(child, entry);
    const a = pc.addTransceiver("audio", { direction: "sendonly" });
    const v = pc.addTransceiver("video", { direction: "sendonly" });
    await a.sender.replaceTrack(tracks.audio);
    await v.sender.replaceTrack(tracks.video);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") outs.get(child)?.pc === pc && outs.delete(child);
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    limit(pc);
    await gathered(pc);
    if (outs.get(child)?.pc !== pc) return;
    send("sig", { to: child, from: me, data: { type: "offer", sdp: pc.localDescription } });
  };
  const answer = async (child: string, sdp: RTCSessionDescriptionInit) => {
    const o = outs.get(child);
    if (!o) return;
    await o.pc.setRemoteDescription(sdp).catch(() => {});
    for (const c of o.ice.splice(0)) await o.pc.addIceCandidate(c).catch(() => {});
  };
  const candidate = async (child: string, c: RTCIceCandidateInit) => {
    const o = outs.get(child);
    if (!o) return false;
    if (o.pc.remoteDescription) await o.pc.addIceCandidate(c).catch(() => {});
    else o.ice.push(c);
    return true;
  };
  /** New camera / a new picture arriving from above: everyone below gets it without reconnecting. */
  const use = (stream: MediaStream | null) => {
    tracks = { audio: stream?.getAudioTracks()[0] ?? null, video: stream?.getVideoTracks()[0] ?? null };
    for (const { pc } of outs.values())
      for (const t of pc.getTransceivers()) t.sender.replaceTrack(t.receiver.track.kind === "audio" ? tracks.audio : tracks.video).catch(() => {});
  };
  return { outs, open, close, answer, candidate, use, closeAll: () => [...outs.keys()].forEach(close) };
}

// ── the host (staff phone) ──────────────────────────────────────────────
export function startHost(streamId: string, stream: MediaStream, ice: RTCIceServer[], ev: Events) {
  const me = uid();
  const { sb, ch } = channel(streamId, me, "host");
  const send = (event: string, payload: any) => ch.send({ type: "broadcast", event, payload }).catch(() => {});
  const feed = feeder(me, ice, send);
  feed.use(stream);
  // who gets the video from whom
  type Node = { parent: string; depth: number; relay: boolean; ready: boolean; children: Set<string> };
  const nodes = new Map<string, Node>();
  const root = { children: new Set<string>() };
  const kids = (id: string) => (id === me ? root.children : nodes.get(id)?.children);
  const below = (p: string, v: string) => {
    // is p v itself or somewhere under v?
    for (let x: string | undefined = p; x && x !== me; x = nodes.get(x)?.parent) if (x === v) return true;
    return false;
  };
  const detach = (v: string) => {
    const n = nodes.get(v);
    if (!n) return;
    kids(n.parent)?.delete(v);
    if (n.parent === me) feed.close(v);
    else send("unfeed", { to: n.parent, child: v });
  };
  const place = (v: string, relay: boolean, avoid?: string) => {
    detach(v);
    const cands: { id: string; depth: number }[] = [];
    if (root.children.size < HOST_CAP) cands.push({ id: me, depth: 0 });
    for (const [id, n] of nodes) if (id !== v && id !== avoid && n.relay && n.ready && n.children.size < RELAY_CAP && !below(id, v)) cands.push({ id, depth: n.depth });
    cands.sort((a, b) => a.depth - b.depth || (kids(a.id)?.size ?? 0) - (kids(b.id)?.size ?? 0));
    const p = cands[0];
    const old = nodes.get(v);
    if (!p) {
      nodes.delete(v);
      send("full", { to: v });
      return;
    }
    nodes.set(v, { parent: p.id, depth: p.depth + 1, relay, ready: false, children: old?.children ?? new Set() });
    kids(p.id)!.add(v);
    send("assign", { to: v, parent: p.id });
    if (p.id === me) feed.open(v);
    else send("feed", { to: p.id, child: v });
  };

  ch.on("broadcast", { event: "want" }, ({ payload }: any) => payload?.from && place(payload.from, Boolean(payload.relay), payload.avoid))
    .on("broadcast", { event: "leaving" }, ({ payload }: any) => {
      const gone = nodes.get(payload?.from);
      if (!gone) return;
      detach(payload.from);
      nodes.delete(payload.from);
      for (const c of gone.children) if (nodes.has(c)) place(c, nodes.get(c)!.relay, payload.from);
    })
    .on("broadcast", { event: "ready" }, ({ payload }: any) => {
      const n = nodes.get(payload?.from);
      if (n) n.ready = true;
    })
    .on("broadcast", { event: "sig" }, ({ payload }: any) => {
      if (payload?.to !== me) return;
      if (payload.data?.type === "answer") feed.answer(payload.from, payload.data.sdp);
      else if (payload.data?.type === "ice") feed.candidate(payload.from, payload.data.c);
    })
    .on("broadcast", { event: "heart" }, ({ payload }: any) => ev.onHeart?.(Number(payload?.n) || 1))
    .on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const viewers = Object.entries(state).filter(([, v]) => v[0]?.role === "viewer").map(([k]) => k);
      ev.onViewers?.(viewers.length);
      // someone left: the people they were feeding get a new source
      for (const id of [...nodes.keys()])
        if (!viewers.includes(id)) {
          const gone = nodes.get(id)!;
          detach(id);
          nodes.delete(id);
          for (const c of gone.children) if (nodes.has(c)) place(c, nodes.get(c)!.relay, id);
        }
    })
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") ch.track({ role: "host" });
    });

  (window as any).__gwzLive = { role: "host", nodes, root };
  return {
    /** a new camera (front/back) */
    setStream(s: MediaStream) {
      feed.use(s);
    },
    heart(n: number) {
      send("heart", { n });
    },
    hide(commentId: string) {
      send("hide", { id: commentId });
    },
    async stop(ended: boolean) {
      if (ended) await send("bye", {});
      feed.closeAll();
      await ch.untrack().catch(() => {});
      sb.removeChannel(ch);
    },
  };
}

// ── a viewer (anyone on the website) ────────────────────────────────────
export function startViewer(streamId: string, ice: RTCIceServer[], ev: Events) {
  const me = uid();
  const relay = goodRelay();
  const { sb, ch } = channel(streamId, me, "viewer");
  const send = (event: string, payload: any) => ch.send({ type: "broadcast", event, payload }).catch(() => {});
  const feed = feeder(me, ice, send);
  let parent: string | null = null;
  let expected: string | null = null;
  let inPc: RTCPeerConnection | null = null;
  let inIce: RTCIceCandidateInit[] = [];
  let hostHere = false;
  let wantAt = 0;
  let state: LiveState = "waiting";
  let stopped = false;
  const set = (s: LiveState) => {
    if (state !== s) {
      state = s;
      ev.onState?.(s);
    }
  };
  const want = (avoid?: string | null) => {
    if (stopped || !hostHere) return;
    wantAt = Date.now();
    send("want", { from: me, relay, avoid: avoid ?? undefined });
  };

  const accept = async (from: string, sdp: RTCSessionDescriptionInit) => {
    if (expected && from !== expected) return; // not the one the host picked for me
    inPc?.close();
    inIce = [];
    parent = from;
    set("connecting");
    const pc = new RTCPeerConnection({ iceServers: ice });
    inPc = pc;
    const got = new MediaStream();
    pc.ontrack = (e) => {
      got.addTrack(e.track);
      ev.onStream?.(got);
      feed.use(got);
    };
    let wobble: ReturnType<typeof setTimeout> | undefined;
    pc.onconnectionstatechange = () => {
      if (inPc !== pc) return;
      clearTimeout(wobble);
      if (pc.connectionState === "connected") {
        set("live");
        send("ready", { from: me });
      }
      // the one feeding me left or the network dropped: ask for someone else
      if (pc.connectionState === "failed") want(parent);
      if (pc.connectionState === "disconnected") wobble = setTimeout(() => inPc === pc && pc.connectionState !== "connected" && want(parent), 2500);
    };
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await gathered(pc);
    if (inPc !== pc) return;
    send("sig", { to: from, from: me, data: { type: "answer", sdp: pc.localDescription } });
    for (const c of inIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
  };

  ch.on("broadcast", { event: "sig" }, async ({ payload }: any) => {
    if (payload?.to !== me) return;
    const d = payload.data;
    if (d?.type === "offer") accept(payload.from, d.sdp);
    else if (d?.type === "answer") feed.answer(payload.from, d.sdp);
    else if (d?.type === "ice") {
      if (await feed.candidate(payload.from, d.c)) return;
      if (payload.from === parent && inPc) {
        if (inPc.remoteDescription) await inPc.addIceCandidate(d.c).catch(() => {});
        else inIce.push(d.c);
      }
    }
  })
    .on("broadcast", { event: "assign" }, ({ payload }: any) => {
      if (payload?.to === me) expected = payload.parent;
    })
    .on("broadcast", { event: "feed" }, ({ payload }: any) => payload?.to === me && feed.open(payload.child))
    .on("broadcast", { event: "unfeed" }, ({ payload }: any) => payload?.to === me && feed.close(payload.child))
    .on("broadcast", { event: "full" }, ({ payload }: any) => {
      if (payload?.to !== me) return;
      set("full");
      wantAt = Date.now() - 5000; // try again in a few seconds (someone may pass it on by then)
    })
    .on("broadcast", { event: "heart" }, ({ payload }: any) => ev.onHeart?.(Number(payload?.n) || 1))
    .on("broadcast", { event: "hide" }, ({ payload }: any) => payload?.id && ev.onHide?.(payload.id))
    .on("broadcast", { event: "bye" }, () => {
      set("ended");
      inPc?.close();
      feed.closeAll();
    })
    .on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const vals = Object.values(state).map((v) => v[0]);
      ev.onViewers?.(vals.filter((v) => v?.role === "viewer").length);
      const was = hostHere;
      hostHere = vals.some((v) => v?.role === "host");
      if (!hostHere && stateNow() !== "ended") set("offair");
      if (hostHere && !was) {
        expected = null;
        want();
      }
    })
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") ch.track({ role: "viewer" });
    });
  const stateNow = () => state;

  // closing the page: say so, so the people I pass the video to move on straight away
  const bye = () => {
    if (!stopped) send("leaving", { from: me });
  };
  addEventListener("pagehide", bye);

  // nothing arrived yet (the host was busy, or full): ask again
  const timer = setInterval(() => {
    if (stopped || !hostHere || state === "ended") return;
    const bad = !inPc || inPc.connectionState === "failed" || inPc.connectionState === "closed";
    if (bad && Date.now() - wantAt > 8000) want(parent);
  }, 3000);

  (window as any).__gwzLive = { role: "viewer", me, relay, get parent() { return parent; }, get state() { return state; }, get conn() { return inPc?.connectionState; }, outs: feed.outs };
  return {
    heart(n: number) {
      send("heart", { n });
    },
    async stop() {
      bye();
      stopped = true;
      removeEventListener("pagehide", bye);
      clearInterval(timer);
      inPc?.close();
      feed.closeAll();
      await ch.untrack().catch(() => {});
      sb.removeChannel(ch);
    },
  };
}
