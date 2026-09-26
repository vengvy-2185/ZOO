import Link from "next/link";
import { MessagesSquare, ChevronLeft, Users, ShieldCheck, Ticket, PawPrint, Sparkles, Map as MapIcon, Trash2, type LucideIcon } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { peopleFor, type Person } from "@/lib/server/avatars";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ChatComposer, ChatScroll, VoiceBubble } from "@/components/staff/ChatBox";
import { deleteChat } from "../actions";
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
  const ch = mine.find((c) => c.key === searchParams.c) ?? mine[0];
  const db = createServiceRoleClient();
  const now = new Date().toISOString();

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: rows }, { data: recent }, { data: presence }, { data: reads }] = await Promise.all([
    db.from("staff_messages").select("*").eq("channel", ch.key).order("created_at", { ascending: false }).limit(80),
    db.from("staff_messages").select("channel, created_at, user_id").in("channel", mine.map((c) => c.key)).neq("user_id", userId).gte("created_at", weekAgo),
    db.from("staff_presence").select("user_id, last_seen").gte("last_seen", new Date(Date.now() - ONLINE_MS).toISOString()),
    db.from("staff_chat_reads").select("channel, last_read_at").eq("user_id", userId),
  ]);
  // newest message per channel, for the list previews
  const { data: lastRows } = await db.from("staff_messages").select("channel, body, audio_url, user_id, created_at").in("channel", mine.map((c) => c.key)).order("created_at", { ascending: false }).limit(300);
  const lastOf = new Map<string, any>();
  for (const r of lastRows ?? []) if (!lastOf.has(r.channel)) lastOf.set(r.channel, r);
  // opening a channel marks it read up to its newest message (the database
  // clock can be a little ahead of this server's, so use whichever is later)
  const newest = rows?.[0]?.created_at as string | undefined;
  const readTo = newest && Date.parse(newest) > Date.parse(now) ? newest : now;
  await db.from("staff_chat_reads").upsert({ user_id: userId, channel: ch.key, last_read_at: readTo });
  const readAt = new Map((reads ?? []).map((r: any) => [r.channel, r.last_read_at as string]));
  readAt.set(ch.key, readTo);
  const msgs = (rows ?? []).reverse() as any[];
  const onlineIds = new Set((presence ?? []).map((p: any) => p.user_id as string));
  onlineIds.add(userId);
  const people = await peopleFor([...msgs.map((m) => m.user_id), ...onlineIds, ...[...lastOf.values()].map((r) => r.user_id)], km);
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
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const dayOf = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

  const shortTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", today ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" } : { day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(d);
  };
  const preview = (r: any) => {
    if (!r) return km ? "មិនទាន់មានសារ" : "No messages yet";
    const who = r.user_id === userId ? (km ? "អ្នក" : "You") : people.get(r.user_id)?.name ?? "";
    return `${who}: ${r.audio_url && !r.body ? (km ? "🎤 សារសំឡេង" : "🎤 Voice message") : r.body}`;
  };

  return (
    <StaffShell bare hideBottomNav={inConversation} title={km ? "ជជែកក្រុម" : "Team chat"}>
      <div className="flex min-h-0 flex-1 md:gap-4 md:px-8 md:py-4">
        {/* ── inbox (list of chats), like Messenger ── */}
        <aside className={cn("min-h-0 w-full flex-col overflow-hidden bg-white md:flex md:w-80 md:flex-shrink-0 md:rounded-3xl md:shadow-soft md:ring-1 md:ring-black/5", inConversation ? "hidden" : "flex")}>
          <div className="px-4 pb-2 pt-4">
            <h1 className="font-display text-2xl font-extrabold text-forest">{km ? "ជជែកក្រុម" : "Chats"}</h1>
          </div>
          {/* online people */}
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-3">
            {online.map(({ id, p }) => (
              <span key={id} className="flex w-14 flex-shrink-0 flex-col items-center gap-1 text-center" title={p!.role}>
                <Avatar p={p} size={48} online />
                <span className="w-full truncate text-[11px] font-semibold text-ink/65">{id === userId ? (km ? "អ្នក" : "You") : p!.name.split(" ")[0]}</span>
              </span>
            ))}
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
            {mine.map((c) => {
              const on = c.key === ch.key && (inConversation || true);
              const n = c.key === ch.key ? 0 : unread.get(c.key) ?? 0;
              const last = lastOf.get(c.key);
              return (
                <Link key={c.key} href={`/staff/chat?c=${c.key}`} className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", on ? "md:bg-[#EEF2FF]" : "hover:bg-slate-50", "active:bg-[#EEF2FF]")}>
                  <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={{ background: c.color }}>
                    <c.Icon size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("min-w-0 flex-1 truncate text-[15px]", n ? "font-extrabold text-forest" : "font-bold text-forest")}>{km ? c.km : c.en}</span>
                      {last && <span className={cn("flex-shrink-0 text-[11px]", n ? "font-bold text-[#1D4ED8]" : "text-ink/40")}>{shortTime(last.created_at)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn("min-w-0 flex-1 truncate text-[13px]", n ? "font-bold text-ink/85" : "text-ink/50")}>{preview(last)}</span>
                      {n > 0 && <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] px-1.5 text-[11px] font-bold text-white">{n > 99 ? "99+" : n}</span>}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* ── conversation ── */}
        <section className={cn("min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:flex md:rounded-3xl md:shadow-soft md:ring-1 md:ring-black/5", inConversation ? "flex" : "hidden")}>
          <div className="flex items-center gap-3 border-b border-black/5 px-3 py-2.5 md:px-4">
            <Link href="/staff/chat" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#1D4ED8] hover:bg-[#EEF2FF] md:hidden" aria-label="back">
              <ChevronLeft size={24} />
            </Link>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: ch.color }}>
              <ch.Icon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-extrabold text-forest">{km ? ch.km : ch.en}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink/50"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {online.length} online</p>
            </div>
            <div className="hidden -space-x-2 sm:flex">
              {online.slice(0, 5).map(({ id, p }) => <Avatar key={id} p={p} size={28} />)}
            </div>
          </div>
          <ChatScroll count={msgs.length}>
            {msgs.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-ink/45">
                <MessagesSquare size={40} className="text-[#BFDBFE]" /> {km ? "មិនទាន់មានសារទេ។ ចាប់ផ្តើមនិយាយ!" : "No messages yet. Say hello!"}
              </div>
            )}
            {msgs.map((m, i) => {
              const own = m.user_id === userId;
              const p = people.get(m.user_id);
              const prev = msgs[i - 1];
              const newDay = !prev || dayOf(prev.created_at) !== dayOf(m.created_at);
              const sameGroup = (x: any, y: any) => x && y && x.user_id === y.user_id && dayOf(x.created_at) === dayOf(y.created_at) && Math.abs(Date.parse(y.created_at) - Date.parse(x.created_at)) < 5 * 60e3;
              const grouped = !newDay && sameGroup(prev, m);
              const lastInGroup = !sameGroup(m, msgs[i + 1]);
              return (
                <div key={m.id}>
                  {newDay && (
                    <p className="my-3 text-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink/45 shadow-sm">{dayOf(m.created_at)}</span>
                    </p>
                  )}
                  <div className={cn("group flex items-end gap-2", own && "flex-row-reverse", grouped && "-mt-1.5")}>
                    {/* like Messenger: others' photo at the bottom of their group, none for me */}
                    {!own && (
                      <span className={cn(!lastInGroup && "invisible")}>
                        <Avatar p={p} online={onlineIds.has(m.user_id)} />
                      </span>
                    )}
                    <div className={cn("flex max-w-[80%] animate-[gwzPop_.25s_ease-out_both] flex-col", own ? "items-end" : "items-start")}>
                      {!grouped && !own && (
                        <p className="mb-0.5 px-1 text-[11px] font-bold text-ink/55">
                          {p?.name ?? "—"} {p?.role && <span className={cn("ml-1 rounded-full px-1.5 py-px", p.admin ? "bg-forest text-white" : "bg-slate-100 text-ink/50")}>{p.role}</span>}
                        </p>
                      )}
                      {m.audio_url && <VoiceBubble src={m.audio_url} secs={m.audio_secs ?? 1} own={own} />}
                      {m.body && (
                        <div className={cn("whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm shadow-sm", m.audio_url && "mt-1", own ? "rounded-br-md bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white" : "rounded-bl-md bg-white text-ink/85 ring-1 ring-black/5")}>
                          {m.body}
                        </div>
                      )}
                      <p className={cn("flex items-center gap-2 px-1 text-[10px] text-ink/35", lastInGroup ? "mt-0.5" : "h-0 overflow-hidden group-hover:h-auto")}>
                        {time(m.created_at)}
                        {(own || manager) && (
                          <form action={deleteChat.bind(null, m.id)} className="opacity-0 transition group-hover:opacity-100">
                            <button aria-label="delete" className="text-ink/35 hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          </form>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </ChatScroll>
          <ChatComposer channel={ch.key} km={km} />
        </section>
      </div>
    </StaffShell>
  );
}
