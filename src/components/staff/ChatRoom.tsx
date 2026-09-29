"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare, Reply, SmilePlus, MoreHorizontal, Trash2, Copy, Share2, Eye, X, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileArchive, File as FileIcon, MapPin, Phone, Video, PhoneOff, Check, CheckCheck, ImageDown } from "lucide-react";
import type { Person } from "@/lib/server/avatars";
import type { ChatFile } from "@/app/staff/(protected)/actions";
import { deleteChat, reactChat } from "@/app/staff/(protected)/actions";
import { createClient } from "@/lib/supabase/client";
import { Linkify } from "@/lib/linkify";
import { msgText } from "@/lib/chat-text";
import { ChatComposer, ChatScroll, VoiceBubble } from "./ChatBox";
import { cn } from "@/lib/utils/cn";

export type Msg = {
  id: string;
  user_id: string | null;
  body: string | null;
  audio_url: string | null;
  audio_secs: number | null;
  files: ChatFile[] | null;
  kind: "text" | "call" | "location";
  meta: any;
  reply_to: string | null;
  created_at: string;
  /** time and day, written on the server (so the phone shows exactly the same text) */
  t: string;
  day: string;
};
export type RoomData = {
  me: string;
  channel: string;
  km: boolean;
  manager: boolean;
  msgs: Msg[];
  /** the message each reply answers (also ones older than the loaded page) */
  replies: Record<string, { user_id: string | null; text: string }>;
  reactions: Record<string, { user_id: string; emoji: string }[]>;
  calls: Record<string, { live: boolean; secs: number; video: boolean }>;
  /** when each person last read this room */
  reads: Record<string, string>;
  members: string[];
  people: Record<string, Person>;
  online: string[];
  activeCall: { id: string; video: boolean; by: string | null } | null;
};

const EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function Avatar({ p, size = 32, online = false }: { p: Person | undefined; size?: number; online?: boolean }) {
  const name = p?.name ?? "?";
  return (
    <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      <span className={cn("flex h-full w-full items-center justify-center overflow-hidden rounded-full font-extrabold ring-2 ring-white", size < 20 ? "text-[8px]" : "text-xs", p?.admin ? "bg-forest text-white" : "bg-[#DBEAFE] text-[#1D4ED8]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p?.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...name][0]?.toUpperCase()}
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </span>
  );
}

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const isImage = (f: ChatFile) => f.type.startsWith("image/");
const isVideo = (f: ChatFile) => f.type.startsWith("video/");
function fileIcon(f: ChatFile) {
  if (/sheet|excel|csv/.test(f.type) || /\.(xlsx?|csv)$/i.test(f.name)) return FileSpreadsheet;
  if (/zip|rar|7z|compressed/.test(f.type)) return FileArchive;
  if (/pdf|word|document|text/.test(f.type)) return FileText;
  return FileIcon;
}
const dur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** The open chat room: messages like Messenger, and the typing box. */
export function ChatRoom(d: RoomData) {
  const { km, me, msgs } = d;
  const router = useRouter();
  const [reply, setReply] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [info, setInfo] = useState<Msg | null>(null);
  const [gallery, setGallery] = useState<{ items: ChatFile[]; i: number } | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [dropping, setDropping] = useState(false);
  const [dropped, setDropped] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<{ key: string; body: string; images: string[]; files: string[] }[]>([]);
  // my message arrived from the server: the "sending" copy goes away
  const count = msgs.length;
  useEffect(() => {
    setPending((list) => {
      list.forEach((x) => x.images.forEach((u) => setTimeout(() => URL.revokeObjectURL(u), 5000)));
      return [];
    });
  }, [count]);
  const chan = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTyping = useRef(0);
  const online = useMemo(() => new Set(d.online), [d.online]);
  const who = (id: string | null) => (id ? d.people[id] : undefined);
  const name = (id: string | null) => (id === me ? (km ? "អ្នក" : "You") : who(id)?.name ?? "—");

  // "… is typing" goes over a live channel (nothing is saved)
  useEffect(() => {
    const sb = createClient();
    const ch = sb.channel(`gwz-typing-${d.channel}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.u && payload.u !== me) setTyping((t) => ({ ...t, [payload.u]: Date.now() }));
    }).subscribe();
    chan.current = ch;
    const id = setInterval(() => setTyping((t) => (Object.values(t).some((x) => Date.now() - x > 4000) ? Object.fromEntries(Object.entries(t).filter(([, x]) => Date.now() - x <= 4000)) : t)), 1000);
    return () => {
      clearInterval(id);
      sb.removeChannel(ch);
    };
  }, [d.channel, me]);
  // someone's message arrived: they stopped typing
  const lastAuthor = msgs[msgs.length - 1]?.user_id;
  useEffect(() => {
    if (lastAuthor) setTyping((t) => (t[lastAuthor] ? Object.fromEntries(Object.entries(t).filter(([k]) => k !== lastAuthor)) : t));
  }, [msgs.length, lastAuthor]);
  const onTyping = () => {
    if (Date.now() - lastTyping.current < 2500) return;
    lastTyping.current = Date.now();
    chan.current?.send({ type: "broadcast", event: "typing", payload: { u: me } }).catch(() => {});
  };

  // who has seen what: each person's picture sits under the last message they read
  const t = (iso: string) => Date.parse(iso);
  const readersAt = useMemo(() => {
    const at = new Map<string, string[]>();
    for (const [uid, when] of Object.entries(d.reads)) {
      if (uid === me) continue;
      let idx = -1;
      for (let i = msgs.length - 1; i >= 0; i--)
        if (t(msgs[i].created_at) <= t(when)) {
          idx = i;
          break;
        }
      if (idx < 0 || msgs[idx].user_id === uid) continue;
      const k = msgs[idx].id;
      at.set(k, [...(at.get(k) ?? []), uid]);
    }
    return at;
  }, [d.reads, msgs, me]);
  const seenBy = (m: Msg) => Object.entries(d.reads).filter(([uid, when]) => uid !== m.user_id && t(when) >= t(m.created_at)).map(([uid]) => uid);
  const lastMine = [...msgs].reverse().find((m) => m.user_id === me)?.id;

  const typers = Object.keys(typing).filter((u) => u !== me);

  const act = (m: Msg | null) => {
    setMenu(m);
    setCopied(false);
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        if (e.dataTransfer.files.length) setDropped([...e.dataTransfer.files]);
      }}
    >
      {d.activeCall && (
        <Link href={`/staff/call/${d.activeCall.id}`} className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-white">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
            {d.activeCall.video ? <Video size={17} /> : <Phone size={17} />}
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold">
            {km ? "កំពុងមានការហៅក្នុងក្រុមនេះ" : "A call is going on in this room"}
            <span className="block text-xs font-semibold text-white/80">{name(d.activeCall.by)}</span>
          </span>
          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-emerald-700">{km ? "ចូលរួម" : "Join"}</span>
        </Link>
      )}

      <ChatScroll count={msgs.length + pending.length}>
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-ink/45">
            <MessagesSquare size={40} className="text-[#BFDBFE]" /> {km ? "មិនទាន់មានសារទេ។ ចាប់ផ្តើមនិយាយ!" : "No messages yet. Say hello!"}
          </div>
        )}
        {msgs.map((m, i) => {
          const own = m.user_id === me;
          const p = who(m.user_id);
          const prev = msgs[i - 1];
          const newDay = !prev || prev.day !== m.day;
          const sameGroup = (x: Msg | undefined, y: Msg | undefined) => !!x && !!y && x.user_id === y.user_id && x.kind !== "call" && y.kind !== "call" && x.day === y.day && Math.abs(t(y.created_at) - t(x.created_at)) < 5 * 60e3;
          const grouped = !newDay && sameGroup(prev, m);
          const lastInGroup = !sameGroup(m, msgs[i + 1]);
          const reacts = d.reactions[m.id] ?? [];
          const readers = readersAt.get(m.id) ?? [];
          const seen = own && m.id === lastMine ? seenBy(m) : [];

          if (m.kind === "call") {
            const c = d.calls[m.meta?.call_id] ?? { live: false, secs: 0, video: !!m.meta?.video };
            return (
              <div key={m.id}>
                {newDay && <DayLine text={m.day} />}
                <div className="my-2 flex justify-center">
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/5">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", c.live ? "bg-emerald-500" : "bg-slate-400")}>{c.live ? c.video ? <Video size={18} /> : <Phone size={18} /> : <PhoneOff size={18} />}</span>
                    <span className="text-sm">
                      <b className="text-forest">{name(m.user_id)}</b> {c.video ? (km ? "បានហៅជាវីដេអូ" : "started a video call") : km ? "បានហៅជាសំឡេង" : "started a voice call"}
                      <span className="block text-xs text-ink/50">
                        {m.t} · {c.live ? (km ? "កំពុងនិយាយ" : "in progress") : `${km ? "បានបញ្ចប់" : "ended"}${c.secs > 5 ? ` · ${dur(c.secs)}` : ""}`}
                      </span>
                    </span>
                    {c.live && (
                      <Link href={`/staff/call/${m.meta.call_id}`} className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-extrabold text-white active:scale-95">
                        {km ? "ចូលរួម" : "Join"}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          const images = (m.files ?? []).filter(isImage);
          const others = (m.files ?? []).filter((f) => !isImage(f));
          const replyTo = m.reply_to ? d.replies[m.reply_to] : undefined;
          const bubble = own ? "bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white" : "bg-white text-ink/85 ring-1 ring-black/5";
          return (
            <div key={m.id}>
              {newDay && <DayLine text={m.day} />}
              <Pressable onLong={() => act(m)} className={cn("group flex items-end gap-2", own && "flex-row-reverse", grouped && "-mt-1.5", reacts.length > 0 && "mb-3")}>
                {!own && <span className={cn(!lastInGroup && "invisible")}><Avatar p={p} online={!!m.user_id && online.has(m.user_id)} /></span>}
                <div className={cn("flex min-w-0 max-w-[80%] animate-[gwzPop_.25s_ease-out_both] flex-col md:max-w-[70%]", own ? "items-end" : "items-start")}>
                  {!grouped && !own && (
                    <p className="mb-0.5 px-1 text-[11px] font-bold text-ink/55">
                      {p?.name ?? "—"} {p?.role && <span className={cn("ml-1 rounded-full px-1.5 py-px", p.admin ? "bg-forest text-white" : "bg-slate-100 text-ink/50")}>{p.role}</span>}
                    </p>
                  )}
                  {replyTo && (
                    <div className={cn("mb-[-6px] max-w-full rounded-2xl bg-slate-200/70 px-3 pb-3 pt-1.5 text-xs text-ink/60", own ? "mr-1" : "ml-1")}>
                      <span className="flex items-center gap-1 font-bold text-ink/50"><Reply size={11} /> {name(replyTo.user_id)}</span>
                      <span className="line-clamp-2">{replyTo.text}</span>
                    </div>
                  )}
                  <div className="relative flex max-w-full flex-col gap-1" style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                    {images.length > 0 && (
                      <div className={cn("grid max-w-[18rem] gap-0.5 overflow-hidden rounded-2xl ring-1 ring-black/5", images.length > 1 && "grid-cols-2")}>
                        {images.slice(0, 4).map((f, k) => (
                          <button key={k} type="button" onClick={() => setGallery({ items: images, i: k })} className="relative block overflow-hidden bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.name} loading="lazy" className={cn("block w-full object-cover", images.length > 1 ? "aspect-square" : "max-h-80")} style={images.length === 1 && f.w && f.h ? { aspectRatio: `${f.w}/${f.h}` } : undefined} />
                            {k === 3 && images.length > 4 && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-extrabold text-white">+{images.length - 4}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {others.map((f, k) =>
                      isVideo(f) ? (
                        <video key={k} src={f.url} controls playsInline preload="metadata" className="max-h-80 max-w-[18rem] rounded-2xl bg-black" />
                      ) : (
                        <FileCard key={k} f={f} own={own} />
                      )
                    )}
                    {m.kind === "location" && m.meta && <LocationCard lat={m.meta.lat} lng={m.meta.lng} acc={m.meta.acc} km={km} own={own} />}
                    {m.audio_url && <VoiceBubble src={m.audio_url} secs={m.audio_secs ?? 1} own={own} />}
                    {m.body && (
                      <div className={cn("whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] leading-snug shadow-sm", own ? "rounded-br-md" : "rounded-bl-md", bubble)}>
                        <Linkify text={m.body} className={cn("break-all font-semibold underline underline-offset-2", own ? "text-white" : "text-[#1D4ED8]")} />
                      </div>
                    )}
                    {reacts.length > 0 && (
                      <button type="button" onClick={() => setInfo(m)} className={cn("absolute -bottom-3.5 z-[1] flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-xs shadow ring-1 ring-black/5", own ? "right-2" : "left-2")}>
                        {[...new Set(reacts.map((r) => r.emoji))].slice(0, 3).join("")}
                        {reacts.length > 1 && <span className="ml-0.5 font-bold text-ink/50">{reacts.length}</span>}
                      </button>
                    )}
                    {/* on a computer: react / answer / more, next to the message */}
                    <div className={cn("absolute top-1/2 hidden -translate-y-1/2 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 md:flex", own ? "right-full mr-1" : "left-full ml-1")}>
                      <HoverBtn label={km ? "ប្រតិកម្ម" : "React"} onClick={() => act(m)}><SmilePlus size={16} /></HoverBtn>
                      <HoverBtn label={km ? "ឆ្លើយតប" : "Reply"} onClick={() => setReply(m)}><Reply size={16} /></HoverBtn>
                      <HoverBtn label={km ? "ច្រើនទៀត" : "More"} onClick={() => act(m)}><MoreHorizontal size={16} /></HoverBtn>
                    </div>
                  </div>
                  {(lastInGroup || seen.length > 0 || m.id === lastMine) && (
                    <p className={cn("mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink/40", reacts.length > 0 && "mt-4")}>
                      {m.t}
                      {m.id === lastMine &&
                        (seen.length ? (
                          <button type="button" onClick={() => setInfo(m)} className="inline-flex items-center gap-0.5 font-bold text-[#1D4ED8] hover:underline">
                            <CheckCheck size={12} /> {km ? `បានឃើញ ${seen.length}` : `Seen by ${seen.length}`}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-0.5"><Check size={12} /> {km ? "បានផ្ញើ" : "Sent"}</span>
                        ))}
                    </p>
                  )}
                </div>
              </Pressable>
              {readers.length > 0 && (
                <button type="button" onClick={() => setInfo(m)} className="ml-auto mt-0.5 flex justify-end -space-x-1 pr-1" title={readers.map((u) => who(u)?.name).join(", ")}>
                  {readers.slice(0, 6).map((u) => <Avatar key={u} p={who(u)} size={16} />)}
                  {readers.length > 6 && <span className="pl-2 text-[10px] font-bold text-ink/40">+{readers.length - 6}</span>}
                </button>
              )}
            </div>
          );
        })}
        {pending.map((x) => (
          <div key={x.key} className="flex flex-col items-end gap-1 opacity-70">
            {x.images.length > 0 && (
              <div className={cn("grid max-w-[18rem] gap-0.5 overflow-hidden rounded-2xl", x.images.length > 1 && "grid-cols-2")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.images.slice(0, 4).map((u) => <img key={u} src={u} alt="" className={cn("block w-full object-cover", x.images.length > 1 ? "aspect-square" : "max-h-80")} />)}
              </div>
            )}
            {x.files.map((f) => <span key={f} className="rounded-2xl bg-[#1D4ED8] px-3.5 py-2 text-sm text-white">📎 {f}</span>)}
            {x.body && <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] px-3.5 py-2 text-[15px] leading-snug text-white md:max-w-[70%]">{x.body}</div>}
            <span className="px-1 text-[10px] text-ink/40">{km ? "កំពុងផ្ញើ…" : "Sending…"}</span>
          </div>
        ))}
        {typers.length > 0 && (
          <div className="flex items-end gap-2">
            <Avatar p={who(typers[0])} />
            <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">
              <span className="flex items-center gap-1">
                {[0, 1, 2].map((k) => <span key={k} className="h-2 w-2 animate-bounce rounded-full bg-ink/35" style={{ animationDelay: `${k * 150}ms` }} />)}
              </span>
            </div>
            <span className="pb-1 text-[11px] text-ink/45">{typers.map((u) => who(u)?.name.split(" ")[0]).join(", ")} {km ? "កំពុងសរសេរ…" : "is typing…"}</span>
          </div>
        )}
      </ChatScroll>

      <ChatComposer channel={d.channel} km={km} reply={reply ? { id: reply.id, name: name(reply.user_id), text: msgText(reply, km) } : null} onCancelReply={() => setReply(null)} onSent={() => setReply(null)} onTyping={onTyping} dropped={dropped} onDropTaken={() => setDropped([])} onPending={(x) => ("done" in x ? setPending((l) => l.filter((y) => y.key !== x.key)) : setPending((l) => [...l, x]))} />

      {dropping && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-3xl border-4 border-dashed border-[#2563EB] bg-[#EEF2FF]/90 text-lg font-extrabold text-[#1D4ED8]">
          {km ? "ទម្លាក់ឯកសារនៅទីនេះដើម្បីផ្ញើ" : "Drop files here to send"}
        </div>
      )}

      {menu && (
        <Sheet onClose={() => act(null)}>
          <div className="flex justify-between gap-1 rounded-full bg-slate-50 p-1.5">
            {EMOJI.map((e) => {
              const mine = (d.reactions[menu.id] ?? []).some((r) => r.user_id === me && r.emoji === e);
              return (
                <button key={e} type="button" onClick={() => { reactChat(menu.id, e).then(() => router.refresh()); act(null); }} className={cn("flex h-11 w-11 items-center justify-center rounded-full text-2xl transition hover:scale-125 active:scale-95", mine && "bg-[#DBEAFE]")}>
                  {e}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-1">
            <SheetBtn icon={<Reply size={18} />} onClick={() => { setReply(menu); act(null); }}>{km ? "ឆ្លើយតប" : "Reply"}</SheetBtn>
            {menu.body && (
              <SheetBtn icon={copied ? <Check size={18} /> : <Copy size={18} />} onClick={() => navigator.clipboard?.writeText(menu.body ?? "").then(() => setCopied(true))}>{copied ? (km ? "បានចម្លង" : "Copied") : km ? "ចម្លងអក្សរ" : "Copy text"}</SheetBtn>
            )}
            <SheetBtn icon={<Share2 size={18} />} onClick={() => shareMsg(menu, km).then(() => act(null))}>{km ? "ចែករំលែកទៅកម្មវិធីផ្សេង" : "Share to another app"}</SheetBtn>
            {(menu.files ?? []).length > 0 && (
              <SheetBtn icon={<ImageDown size={18} />} onClick={() => { (menu.files ?? []).forEach((f) => window.open(f.url, "_blank", "noopener")); act(null); }}>{km ? "ទាញយក / រក្សាទុក" : "Download / save"}</SheetBtn>
            )}
            <SheetBtn icon={<Eye size={18} />} onClick={() => { setInfo(menu); act(null); }}>{km ? "នរណាខ្លះបានឃើញ" : "Who has seen it"}</SheetBtn>
            {(menu.user_id === me || d.manager) && (
              <SheetBtn danger icon={<Trash2 size={18} />} onClick={() => { if (confirm(km ? "លុបសារនេះ?" : "Delete this message?")) { deleteChat(menu.id).then(() => router.refresh()); act(null); } }}>{km ? "លុបសារ" : "Delete"}</SheetBtn>
            )}
          </div>
        </Sheet>
      )}

      {info && (
        <Sheet onClose={() => setInfo(null)}>
          <p className="line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-ink/70">{msgText(info, km)}</p>
          {(d.reactions[info.id] ?? []).length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-extrabold uppercase tracking-wider text-ink/45">{km ? "ប្រតិកម្ម" : "Reactions"}</h3>
              <ul className="mt-1.5 space-y-1.5">
                {(d.reactions[info.id] ?? []).map((r) => (
                  <li key={r.user_id} className="flex items-center gap-2.5 text-sm"><Avatar p={who(r.user_id)} size={28} /> <span className="flex-1 font-semibold text-forest">{name(r.user_id)}</span> <span className="text-xl">{r.emoji}</span></li>
                ))}
              </ul>
            </>
          )}
          {(() => {
            const seenIds = seenBy(info);
            const notYet = d.members.filter((u) => u !== info.user_id && !seenIds.includes(u));
            return (
              <>
                <h3 className="mt-4 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700"><CheckCheck size={14} /> {km ? `បានឃើញ (${seenIds.length})` : `Seen (${seenIds.length})`}</h3>
                <ul className="mt-1.5 space-y-1.5">
                  {seenIds.length === 0 && <li className="text-sm text-ink/45">{km ? "មិនទាន់មាននរណាឃើញទេ" : "Nobody yet"}</li>}
                  {seenIds.map((u) => (
                    <li key={u} className="flex items-center gap-2.5 text-sm"><Avatar p={who(u)} size={28} online={online.has(u)} /> <span className="flex-1 font-semibold text-forest">{name(u)}</span> <span className="text-[11px] text-ink/40">{who(u)?.role}</span></li>
                  ))}
                </ul>
                {notYet.length > 0 && (
                  <>
                    <h3 className="mt-4 text-xs font-extrabold uppercase tracking-wider text-ink/45">{km ? `មិនទាន់ឃើញ (${notYet.length})` : `Not yet (${notYet.length})`}</h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {notYet.map((u) => (
                        <li key={u} className="flex items-center gap-2.5 text-sm text-ink/55"><Avatar p={who(u)} size={28} online={online.has(u)} /> <span className="flex-1">{name(u)}</span></li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            );
          })()}
        </Sheet>
      )}

      {gallery && <Gallery items={gallery.items} start={gallery.i} onClose={() => setGallery(null)} km={km} />}
    </div>
  );
}

function DayLine({ text }: { text: string }) {
  return (
    <p className="my-3 text-center">
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink/45 shadow-sm">{text}</span>
    </p>
  );
}

function HoverBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-full text-ink/45 hover:bg-slate-100 hover:text-ink/80">
      {children}
    </button>
  );
}

/** Press and hold (phone) or right-click (computer) opens the message menu. */
function Pressable({ onLong, className, children }: { onLong: () => void; className?: string; children: React.ReactNode }) {
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  return (
    <div
      className={cn(className, "select-none md:select-text")}
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("a,button,video,audio")) return;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          navigator.vibrate?.(15);
          onLong();
        }, 450);
      }}
      onPointerMove={(e) => start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10 && cancel()}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("a,video,audio,img")) return;
        e.preventDefault();
        onLong();
      }}
    >
      {children}
    </div>
  );
}

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 backdrop-blur-[2px] md:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-md animate-[gwzPop_.2s_ease-out_both] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lift md:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 md:hidden" />
        {children}
      </div>
    </div>,
    document.body
  );
}
function SheetBtn({ icon, onClick, children, danger }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-bold transition hover:bg-slate-50 active:bg-slate-100", danger ? "text-red-600" : "text-forest")}>
      <span className={danger ? "text-red-500" : "text-ink/50"}>{icon}</span> {children}
    </button>
  );
}

async function shareMsg(m: Msg, km: boolean) {
  const text = m.kind === "location" && m.meta ? `https://maps.google.com/?q=${m.meta.lat},${m.meta.lng}` : msgText(m, km);
  const url = m.files?.[0]?.url;
  try {
    // real files where the phone can (photos to Telegram, Facebook…), else the link
    if (m.files?.length && navigator.canShare) {
      const files = await Promise.all(m.files.slice(0, 5).map(async (f) => new File([await (await fetch(f.url)).blob()], f.name, { type: f.type })));
      if (navigator.canShare({ files })) return await navigator.share({ files, text: m.body ?? undefined });
    }
    if (navigator.share) return await navigator.share({ text: m.body ?? text, url });
    await navigator.clipboard?.writeText([m.body ?? text, url].filter(Boolean).join("\n"));
    alert(km ? "បានចម្លង — អាចបិទភ្ជាប់ (paste) ក្នុងកម្មវិធីផ្សេងបាន" : "Copied — paste it in another app");
  } catch {
    /* cancelled */
  }
}

function FileCard({ f, own }: { f: ChatFile; own: boolean }) {
  const Icon = fileIcon(f);
  return (
    <a href={f.url} target="_blank" rel="noopener noreferrer" download={f.name} className={cn("flex w-64 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 shadow-sm transition active:scale-[.98]", own ? "bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white" : "bg-white text-forest ring-1 ring-black/5 hover:bg-slate-50")}>
      <span className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl", own ? "bg-white/20" : "bg-[#EEF2FF] text-[#1D4ED8]")}><Icon size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{f.name}</span>
        <span className={cn("text-xs", own ? "text-white/75" : "text-ink/45")}>{size(f.size)}</span>
      </span>
      <Download size={18} className={own ? "text-white/80" : "text-ink/40"} />
    </a>
  );
}

function LocationCard({ lat, lng, acc, km, own }: { lat: number; lng: number; acc?: number; km: boolean; own: boolean }) {
  const d = 0.004;
  return (
    <div className={cn("w-64 max-w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5", own ? "bg-[#1D4ED8] text-white" : "bg-white text-forest")}>
      <iframe title="map" loading="lazy" className="pointer-events-none block h-36 w-full border-0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`} />
      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold">
        <MapPin size={17} /> <span className="flex-1">{km ? "ទីតាំងបច្ចុប្បន្ន" : "Current location"}{acc ? <span className="block text-[11px] font-semibold opacity-60">± {acc} m</span> : null}</span>
        <span className="text-xs underline">{km ? "បើកផែនទី" : "Open map"}</span>
      </a>
    </div>
  );
}

function Gallery({ items, start, onClose, km }: { items: ChatFile[]; start: number; onClose: () => void; km: boolean }) {
  const [i, setI] = useState(start);
  const f = items[i];
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(items.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [items.length, onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[96] flex flex-col bg-black/95 text-white" onClick={onClose}>
      <div className="flex items-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <span className="flex-1 truncate text-sm text-white/70">{f.name} {items.length > 1 && `· ${i + 1}/${items.length}`}</span>
        <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-bold hover:bg-white/20"><Download size={17} /> {km ? "រក្សាទុក" : "Save"}</a>
        <button type="button" onClick={onClose} aria-label="close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.url} alt={f.name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {i > 0 && <button type="button" onClick={(e) => { e.stopPropagation(); setI(i - 1); }} className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="previous"><ChevronLeft size={26} /></button>}
        {i < items.length - 1 && <button type="button" onClick={(e) => { e.stopPropagation(); setI(i + 1); }} className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="next"><ChevronRight size={26} /></button>}
      </div>
    </div>,
    document.body
  );
}
