import Link from "next/link";
import { MessagesSquare, Users, ShieldCheck, Ticket, PawPrint, Sparkles, Map as MapIcon, Trash2, type LucideIcon } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ChatComposer, ChatScroll } from "@/components/staff/ChatBox";
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
  const [{ data: rows }, { data: latest }] = await Promise.all([
    db.from("staff_messages").select("*").eq("channel", ch.key).order("created_at", { ascending: false }).limit(80),
    db.from("staff_messages").select("channel, created_at, user_id").in("channel", mine.map((c) => c.key)).gte("created_at", new Date(Date.now() - 864e5).toISOString()),
  ]);
  const msgs = (rows ?? []).reverse() as any[];
  const ids = [...new Set(msgs.map((m) => m.user_id).filter(Boolean))];
  const [{ data: staff }, { data: profiles }] = await Promise.all([
    ids.length ? db.from("staff_members").select("user_id, full_name, position:staff_positions(name, name_km)").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("profiles").select("id, full_name, avatar_url, role").in("id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const staffOf = new Map((staff ?? []).map((s: any) => [s.user_id, s]));
  const profOf = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const who = (id: string) => {
    const s: any = staffOf.get(id);
    const p: any = profOf.get(id);
    return {
      name: s?.full_name ?? p?.full_name ?? "Admin",
      role: p?.role === "admin" ? (km ? "អ្នកគ្រប់គ្រងប្រព័ន្ធ" : "Admin") : (km && s?.position?.name_km) || s?.position?.name || "",
      admin: p?.role === "admin",
      avatar: p?.avatar_url ?? null,
    };
  };
  const unread = new Map<string, number>();
  for (const m of latest ?? []) if (m.user_id !== userId) unread.set(m.channel, (unread.get(m.channel) ?? 0) + 1);
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const dayOf = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

  return (
    <StaffShell title={km ? "ជជែកក្រុម" : "Team chat"} subtitle={km ? "Admin និងបុគ្គលិកជជែកជាមួយគ្នា តាមក្រុមការងារនីមួយៗ។ សារថ្មីលោតមកដោយខ្លួនឯង។" : "Admins and staff talk together, with a channel for each team. New messages appear by themselves."}>
      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        {/* channels */}
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {mine.map((c) => {
            const on = c.key === ch.key;
            const n = unread.get(c.key) ?? 0;
            return (
              <Link key={c.key} href={`/staff/chat?c=${c.key}`} className={cn("flex flex-shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold shadow-soft transition", on ? "text-white" : "bg-white text-forest hover:-translate-y-0.5")} style={on ? { background: c.color } : undefined}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", on ? "bg-white/20" : "text-white")} style={on ? undefined : { background: c.color }}><c.Icon size={16} /></span>
                <span className="flex-1 whitespace-nowrap">{km ? c.km : c.en}</span>
                {n > 0 && !on && <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{n}</span>}
              </Link>
            );
          })}
        </nav>

        {/* messages */}
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: ch.color }}><ch.Icon size={19} /></span>
            <div>
              <p className="font-display text-lg font-extrabold text-forest"># {km ? ch.km : ch.en}</p>
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
              const w = who(m.user_id);
              const prev = msgs[i - 1];
              const newDay = !prev || dayOf(prev.created_at) !== dayOf(m.created_at);
              const grouped = prev && !newDay && prev.user_id === m.user_id && Date.parse(m.created_at) - Date.parse(prev.created_at) < 5 * 60e3;
              return (
                <div key={m.id}>
                  {newDay && <p className="my-3 text-center"><span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink/45 shadow-sm">{dayOf(m.created_at)}</span></p>}
                  <div className={cn("group flex items-end gap-2", own && "flex-row-reverse", grouped && "-mt-1")}>
                    <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-extrabold", grouped && "invisible", w.admin ? "bg-forest text-white" : "bg-[#DBEAFE] text-[#1D4ED8]")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {w.avatar ? <img src={w.avatar} alt="" className="h-full w-full object-cover" /> : w.name.slice(0, 1)}
                    </span>
                    <div className={cn("max-w-[78%] animate-[gwzPop_.25s_ease-out_both]", own && "items-end text-right")}>
                      {!grouped && !own && (
                        <p className="mb-0.5 px-1 text-[11px] font-bold text-ink/55">
                          {w.name} {w.role && <span className={cn("ml-1 rounded-full px-1.5 py-px", w.admin ? "bg-forest text-white" : "bg-slate-100 text-ink/50")}>{w.role}</span>}
                        </p>
                      )}
                      <div className={cn("inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm shadow-sm", own ? "rounded-br-md bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white" : "rounded-bl-md bg-white text-ink/85 ring-1 ring-black/5")}>
                        {m.body}
                      </div>
                      <p className={cn("mt-0.5 flex items-center gap-2 px-1 text-[10px] text-ink/35", own && "justify-end")}>
                        {time(m.created_at)}
                        {(own || manager) && (
                          <form action={deleteChat.bind(null, m.id)} className="opacity-0 transition group-hover:opacity-100">
                            <button aria-label="delete" className="text-ink/35 hover:text-red-500"><Trash2 size={11} /></button>
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
