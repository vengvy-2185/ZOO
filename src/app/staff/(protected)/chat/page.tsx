import Link from "next/link";
import { MessagesSquare, Users, ShieldCheck, Ticket, PawPrint, Sparkles, Map as MapIcon, Trash2, type LucideIcon } from "lucide-react";
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
  const people = await peopleFor([...msgs.map((m) => m.user_id), ...onlineIds], km);

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

  return (
    <StaffShell title={km ? "ជជែកក្រុម" : "Team chat"} subtitle={km ? "Admin និងបុគ្គលិកជជែកជាមួយគ្នា ជាអក្សរ ឬជាសំឡេង។ សារថ្មីលោតមកដោយខ្លួនឯង។" : "Admins and staff talk together, by text or voice. New messages appear by themselves."}>
      {/* who's online */}
      <section className="card flex items-center gap-3 overflow-hidden p-3">
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          {online.length} {km ? "online" : "online"}
        </span>
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {online.map(({ id, p }) => (
            <span key={id} className="flex flex-shrink-0 items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3" title={p!.role}>
              <Avatar p={p} size={30} online />
              <span className="max-w-[8rem] truncate text-xs font-bold text-forest">{id === userId ? (km ? "អ្នក" : "You") : p!.name}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        {/* channels */}
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {mine.map((c) => {
            const on = c.key === ch.key;
            const n = on ? 0 : unread.get(c.key) ?? 0;
            return (
              <Link key={c.key} href={`/staff/chat?c=${c.key}`} className={cn("flex flex-shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold shadow-soft transition", on ? "text-white" : "bg-white text-forest hover:-translate-y-0.5")} style={on ? { background: c.color } : undefined}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", on ? "bg-white/20" : "text-white")} style={on ? undefined : { background: c.color }}>
                  <c.Icon size={16} />
                </span>
                <span className="flex-1 whitespace-nowrap">{km ? c.km : c.en}</span>
                {n > 0 && <span className="flex h-5 min-w-5 animate-[gwzPop_.3s_ease-out_both] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] text-white">{n > 99 ? "99+" : n}</span>}
              </Link>
            );
          })}
        </nav>

        {/* messages */}
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: ch.color }}>
              <ch.Icon size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-extrabold text-forest"># {km ? ch.km : ch.en}</p>
              <p className="text-xs text-ink/45">{msgs.length} {km ? "សារ" : "messages"}</p>
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
              const grouped = prev && !newDay && prev.user_id === m.user_id && Date.parse(m.created_at) - Date.parse(prev.created_at) < 5 * 60e3;
              return (
                <div key={m.id}>
                  {newDay && (
                    <p className="my-3 text-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink/45 shadow-sm">{dayOf(m.created_at)}</span>
                    </p>
                  )}
                  <div className={cn("group flex items-end gap-2", own && "flex-row-reverse", grouped && "-mt-1")}>
                    <span className={cn(grouped && "invisible")}>
                      <Avatar p={p} online={onlineIds.has(m.user_id)} />
                    </span>
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
                      <p className="mt-0.5 flex items-center gap-2 px-1 text-[10px] text-ink/35">
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
