import Link from "next/link";
import { ChevronLeft, Users, ShieldCheck, Ticket, PawPrint, Sparkles, Map as MapIcon, Lock, UserRound, type LucideIcon } from "lucide-react";
import { dmPeer, inDm } from "@/lib/chat-dm";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { peopleFor, type Person } from "@/lib/server/avatars";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ChatRoom, type Msg } from "@/components/staff/ChatRoom";
import { msgText } from "@/lib/chat-text";
import { CallButtons, CallPerson } from "@/components/staff/CallButtons";
import { ChatList } from "@/components/staff/ChatList";
import { staffIds, managerIds } from "@/lib/server/push";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Team chat", "ជជែកក្រុម");

const CHANNELS: { key: string; Icon: LucideIcon; en: string; km: string; color: string }[] = [
  { key: "all", Icon: Users, en: "Everyone", km: "ទាំងអស់គ្នា", color: "#1D4ED8" },
  { key: "managers", Icon: ShieldCheck, en: "Managers", km: "អ្នកគ្រប់គ្រង", color: "#BE185D" },
  { key: "tickets", Icon: Ticket, en: "Tickets & gate", km: "សំបុត្រ", color: "#2563EB" },
  { key: "animals", Icon: PawPrint, en: "Animal care", km: "ថែសត្វ", color: "#B45309" },
  { key: "cleaning", Icon: Sparkles, en: "Cleaning", km: "សម្អាត", color: "#0F766E" },
  { key: "guide", Icon: MapIcon, en: "Guides", km: "មគ្គុទ្ទេសក៍", color: "#7C3AED" },
];
const ONLINE_MS = 45_000;

function Avatar({ p, size = 32, online = false }: { p: Person | undefined; size?: number; online?: boolean }) {
  const name = p?.name ?? "?";
  return (
    <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      <span className={cn("flex h-full w-full items-center justify-center overflow-hidden rounded-full text-xs font-extrabold ring-2 ring-white", p?.admin ? "bg-forest text-white" : "bg-[#DBEAFE] text-[#1D4ED8]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p?.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : [...name][0]?.toUpperCase()}
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </span>
  );
}

/** One chat for admins and staff together, with a channel per team. */
export default async function ChatPage({ searchParams }: { searchParams: { c?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const mine = CHANNELS.filter((c) => access.admin || c.key === "all" || (c.key === "managers" ? access.perms.has("reports") : access.perms.has(c.key as any)));
  const db = createServiceRoleClient();
  // my private chats: every room named after me and one other person
  const { data: dmRows } = await db.from("staff_messages").select("channel").like("channel", `dm:%${userId}%`).order("created_at", { ascending: false }).limit(500);
  const wanted = searchParams.c && inDm(searchParams.c, userId) ? [searchParams.c] : [];
  const dmKeys = [...new Set([...wanted, ...((dmRows ?? []) as any[]).map((r) => r.channel as string)])].filter((k) => inDm(k, userId));
  const dmPeople = await peopleFor(dmKeys.map((k) => dmPeer(k, userId)!), km);
  const dms = dmKeys.map((k) => {
    const p = dmPeople.get(dmPeer(k, userId)!);
    return { key: k, Icon: UserRound as LucideIcon, en: p?.name ?? "?", km: p?.name ?? "?", color: "#0E7490", peer: dmPeer(k, userId)!, avatar: p?.avatar ?? null };
  });
  const rooms = [...mine.map((c) => ({ ...c, peer: null as string | null, avatar: null as string | null })), ...dms];
  const ch = rooms.find((c) => c.key === searchParams.c) ?? rooms[0];
  const now = new Date().toISOString();

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: rows }, { data: recent }, { data: presence }, { data: reads }] = await Promise.all([
    db.from("staff_messages").select("*").eq("channel", ch.key).order("created_at", { ascending: false }).limit(80),
    db.from("staff_messages").select("channel, created_at, user_id").in("channel", rooms.map((c) => c.key)).neq("user_id", userId).gte("created_at", weekAgo),
    db.from("staff_presence").select("user_id, last_seen").gte("last_seen", new Date(Date.now() - ONLINE_MS).toISOString()),
    db.from("staff_chat_reads").select("channel, last_read_at").eq("user_id", userId),
  ]);
  // newest message per channel, for the list previews
  const { data: lastRows } = await db.from("staff_messages").select("channel, body, audio_url, files, kind, meta, user_id, created_at").in("channel", rooms.map((c) => c.key)).order("created_at", { ascending: false }).limit(400);
  const lastOf = new Map<string, any>();
  for (const r of lastRows ?? []) if (!lastOf.has(r.channel)) lastOf.set(r.channel, r);
  // opening a room marks it read up to its newest message. Only when that is
  // news: others see "seen" change, and saving the same thing again would
  // make every open page refresh for nothing.
  const newest = rows?.[0]?.created_at as string | undefined;
  const readAt = new Map((reads ?? []).map((r: any) => [r.channel, r.last_read_at as string]));
  const before = readAt.get(ch.key);
  if (newest && (!before || Date.parse(before) < Date.parse(newest))) {
    await db.from("staff_chat_reads").upsert({ user_id: userId, channel: ch.key, last_read_at: newest });
    readAt.set(ch.key, newest);
  } else if (!newest) readAt.set(ch.key, now);
  const msgs = ((rows ?? []) as any[]).reverse() as Msg[];
  const ids = msgs.map((m) => m.id);
  const replyIds = [...new Set(msgs.map((m) => m.reply_to).filter(Boolean))] as string[];
  const callIds = msgs.filter((m) => m.kind === "call" && m.meta?.call_id).map((m) => m.meta.call_id as string);
  const aliveSince = new Date(Date.now() - 60e3).toISOString();
  const [{ data: reactRows }, { data: roomReads }, { data: callRows }, { data: replyRows }, { data: openCall }, members] = await Promise.all([
    ids.length ? db.from("staff_message_reactions").select("message_id, user_id, emoji").in("message_id", ids).order("created_at") : Promise.resolve({ data: [] as any[] }),
    db.from("staff_chat_reads").select("user_id, last_read_at").eq("channel", ch.key),
    callIds.length ? db.from("staff_calls").select("id, video, created_at, alive_at, ended_at").in("id", callIds) : Promise.resolve({ data: [] as any[] }),
    replyIds.length ? db.from("staff_messages").select("id, user_id, body, kind, files, audio_url, meta").in("id", replyIds) : Promise.resolve({ data: [] as any[] }),
    db.from("staff_calls").select("id, video, started_by").eq("channel", ch.key).is("to_user", null).is("ended_at", null).gte("alive_at", aliveSince).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ch.peer ? Promise.resolve([userId, ch.peer]) : ch.key === "all" ? Promise.all([staffIds(), managerIds()]).then((x) => x.flat()) : ch.key === "managers" ? managerIds() : Promise.all([staffIds(ch.key), managerIds()]).then((x) => x.flat()),
  ]);
  const reactions: Record<string, { user_id: string; emoji: string }[]> = {};
  for (const r of reactRows ?? []) (reactions[r.message_id] ??= []).push({ user_id: r.user_id, emoji: r.emoji });
  const calls: Record<string, { live: boolean; secs: number; video: boolean }> = {};
  for (const c of callRows ?? []) {
    const live = !c.ended_at && c.alive_at >= aliveSince;
    const end = c.ended_at ?? c.alive_at;
    calls[c.id] = { live, video: c.video, secs: Math.max(0, (Date.parse(end) - Date.parse(c.created_at)) / 1000) };
  }
  const replies: Record<string, { user_id: string | null; text: string }> = {};
  for (const r of replyRows ?? []) replies[r.id] = { user_id: r.user_id, text: msgText(r as any, km) };
  const roomReadMap: Record<string, string> = {};
  for (const r of roomReads ?? []) roomReadMap[r.user_id] = r.last_read_at;
  const memberIds = [...new Set(members as string[])];
  const team = [...new Set([...(await staffIds()), ...(await managerIds())])].filter((u) => u !== userId);
  const onlineIds = new Set((presence ?? []).map((p: any) => p.user_id as string));
  onlineIds.add(userId);
  const people = await peopleFor(
    [...msgs.map((m) => m.user_id ?? ""), ...onlineIds, ...[...lastOf.values()].map((r) => r.user_id), ...memberIds, ...Object.keys(roomReadMap), ...(reactRows ?? []).map((r: any) => r.user_id), ...Object.values(replies).map((r) => r.user_id ?? ""), openCall?.started_by ?? "", ...team],
    km
  );
  const inConversation = Boolean(searchParams.c);

  // unread = messages from others after I last read that channel
  const unread = new Map<string, number>();
  for (const m of recent ?? []) {
    const r = readAt.get(m.channel);
    if (!r || Date.parse(m.created_at) > Date.parse(r)) unread.set(m.channel, (unread.get(m.channel) ?? 0) + 1);
  }
  const online = [...onlineIds]
    .map((id) => ({ id, p: people.get(id) }))
    .filter((x) => x.p)
    .sort((a, b) => (a.id === userId ? -1 : b.id === userId ? 1 : a.p!.name.localeCompare(b.p!.name)));

  return (
    <StaffShell bare hideBottomNav={inConversation} title={km ? "ជជែកក្រុម" : "Team chat"}>
      <div className="flex min-h-0 flex-1 md:gap-4 md:px-8 md:py-4">
        {/* ── inbox (list of chats), like Messenger ── */}
        <aside className={cn("min-h-0 w-full flex-col overflow-hidden bg-white md:flex md:w-80 md:flex-shrink-0 md:rounded-3xl md:shadow-soft md:ring-1 md:ring-black/5", inConversation ? "hidden" : "flex")}>
          <div className="px-4 pb-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-2xl font-extrabold text-forest">{km ? "ជជែកក្រុម" : "Chats"}</h1>
              <CallPerson km={km} me={userId} people={team.filter((u) => people.has(u)).map((u) => ({ id: u, name: people.get(u)!.name, avatar: people.get(u)!.avatar, role: people.get(u)!.role, online: onlineIds.has(u) }))} />
            </div>
          </div>
          {/* online people */}
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-3">
            {online.map(({ id, p }) => (
              <Link key={id} href={id === userId ? "/staff/chat" : `/staff/chat?c=dm:${[userId, id].sort().join(":")}`} className="flex w-14 flex-shrink-0 flex-col items-center gap-1 text-center" title={id === userId ? p!.role : km ? `សារផ្ទាល់ទៅ ${p!.name}` : `Message ${p!.name}`}>
                <Avatar p={p} size={48} online />
                <span className="w-full truncate text-[11px] font-semibold text-ink/65">{id === userId ? (km ? "អ្នក" : "You") : p!.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
          <ChatList
            rooms={[
              ...mine.map((c) => ({ key: c.key, label: km ? c.km : c.en, color: c.color })),
              ...[...dms]
                .sort((a, b) => (lastOf.get(b.key)?.created_at ?? "").localeCompare(lastOf.get(a.key)?.created_at ?? ""))
                .map((c) => ({ key: c.key, label: c.en, color: c.color, avatar: people.get(c.peer)?.avatar ?? c.avatar, dm: true, online: onlineIds.has(c.peer) })),
            ]}
            current={ch.key}
            last={Object.fromEntries(rooms.map((c) => [c.key, lastOf.get(c.key) ?? null]))}
            unread={Object.fromEntries(rooms.map((c) => [c.key, unread.get(c.key) ?? 0]))}
            me={userId}
            names={Object.fromEntries([...people].map(([id, p]) => [id, p.name]))}
            km={km}
          />
        </aside>

        {/* ── conversation ── */}
        <section className={cn("min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:flex md:rounded-3xl md:shadow-soft md:ring-1 md:ring-black/5", inConversation ? "flex" : "hidden")}>
          <div className="flex items-center gap-3 border-b border-black/5 px-3 py-2.5 md:px-4">
            <Link href="/staff/chat" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#1D4ED8] hover:bg-[#EEF2FF] md:hidden" aria-label="back">
              <ChevronLeft size={24} />
            </Link>
            {ch.peer ? (
              <Avatar p={people.get(ch.peer)} size={40} online={onlineIds.has(ch.peer)} />
            ) : (
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: ch.color }}>
                <ch.Icon size={19} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-extrabold text-forest">{ch.peer ? people.get(ch.peer)?.name ?? ch.en : km ? ch.km : ch.en}</p>
              {ch.peer ? (
                <p className="flex items-center gap-1.5 text-xs text-ink/50"><Lock size={11} /> {km ? "សារផ្ទាល់ · មានតែអ្នកទាំងពីរប៉ុណ្ណោះឃើញ" : "Private · only you two can see it"}{onlineIds.has(ch.peer) ? (km ? " · កំពុងប្រើ" : " · online") : ""}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-ink/50"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {online.length} online</p>
              )}
            </div>
            <div className={cn("hidden -space-x-2", !ch.peer && "lg:flex")}>
              {online.slice(0, 5).map(({ id, p }) => <Avatar key={id} p={p} size={28} />)}
            </div>
            <CallButtons channel={ch.key} km={km} />
          </div>
          <ChatRoom
            key={ch.key}
            me={userId}
            channel={ch.key}
            km={km}
            manager={manager}
            msgs={msgs}
            replies={replies}
            reactions={reactions}
            calls={calls}
            reads={roomReadMap}
            members={memberIds}
            people={Object.fromEntries(people)}
            online={[...onlineIds]}
            activeCall={openCall ? { id: openCall.id, video: openCall.video, by: openCall.started_by } : null}
          />
        </section>
      </div>
    </StaffShell>
  );
}
