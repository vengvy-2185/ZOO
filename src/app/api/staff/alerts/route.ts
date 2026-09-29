import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { msgText } from "@/lib/chat-text";
import { getI18n } from "@/lib/i18n/server";

// What the staff sound player needs, checked every few seconds from any
// page: open SOS alerts (managers see all, others their own), ids of things
// that deserve a chime, and the admin's sound settings.
export const dynamic = "force-dynamic";
const H = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ allowed: false }, { headers: H });
  const access = await staffAccess(me.id);
  if (!access.ok) return NextResponse.json({ allowed: false }, { headers: H });
  const manager = access.admin || access.perms.has("reports");
  const db = createServiceRoleClient();
  // heartbeat: "online" in the team chat
  const path = (new URL(req.url).searchParams.get("p") ?? "").slice(0, 80);
  await db.from("staff_presence").upsert({ user_id: me.id, last_seen: new Date().toISOString(), path });
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [s, { data: alerts }, { data: tasks }, { data: notices }, supplies, issues] = await Promise.all([
    getStaffSettings(),
    db.from("staff_alerts").select("id, user_id, kind, place, note, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    db.from("staff_tasks").select("id, assigned_to, section").eq("status", "open").limit(200),
    db.from("staff_announcements").select("id, title, body, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    manager ? db.from("staff_supply_requests").select("id").eq("status", "pending").limit(50) : Promise.resolve({ data: [] as any[] }),
    manager ? db.from("staff_issues").select("id").eq("status", "open").limit(50) : Promise.resolve({ data: [] as any[] }),
  ]);
  // chat messages from others in my channels, last 2 hours
  const channels = ["all", ...(manager ? ["managers"] : []), ...(["tickets", "animals", "cleaning", "guide"] as const).filter((c) => access.admin || access.perms.has(c))];
  const [{ data: msgRows }, { data: reads }] = await Promise.all([
    db.from("staff_messages").select("id, user_id, channel, created_at, body, kind, files, audio_url, meta").in("channel", channels).gte("created_at", new Date(Date.now() - 2 * 3600e3).toISOString()).limit(60),
    db.from("staff_chat_reads").select("channel, last_read_at").eq("user_id", me.id),
  ]);
  const readAt = new Map((reads ?? []).map((r: any) => [r.channel, Date.parse(r.last_read_at)]));
  // only messages I haven't read yet
  const msgs = (msgRows ?? []).filter((m: any) => Date.parse(m.created_at) > (readAt.get(m.channel) ?? 0));
  // calls ringing in my rooms right now (started in the last minute, still going)
  const { data: ringing } = await db
    .from("staff_calls")
    .select("id, channel, video, started_by, created_at")
    .in("channel", channels)
    .is("ended_at", null)
    .gte("created_at", new Date(Date.now() - 60e3).toISOString())
    .gte("alive_at", new Date(Date.now() - 45e3).toISOString())
    .neq("started_by", me.id)
    .limit(3);
  // names and photos for the pop-ups on screen
  const km = getI18n().locale === "km";
  const fresh = (msgs as any[]).filter((m) => m.user_id !== me.id && m.kind !== "call" && Date.parse(m.created_at) > Date.now() - 10 * 60e3).slice(-5);
  const faces = [...new Set([...fresh.map((m) => m.user_id), ...(ringing ?? []).map((c: any) => c.started_by)].filter(Boolean))];
  const [{ data: profs }, { data: staffNames }] = faces.length
    ? await Promise.all([db.from("profiles").select("id, full_name, avatar_url").in("id", faces), db.from("staff_members").select("user_id, full_name, full_name_km").in("user_id", faces)])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const sn = new Map((staffNames ?? []).map((x: any) => [x.user_id, (km && x.full_name_km) || x.full_name]));
  const person = (id: string) => {
    const pr: any = (profs ?? []).find((x: any) => x.id === id);
    return { name: sn.get(id) || pr?.full_name || "Admin", avatar: pr?.avatar_url ?? null };
  };
  const ROOM: Record<string, string> = km
    ? { all: "ទាំងអស់គ្នា", managers: "អ្នកគ្រប់គ្រង", tickets: "សំបុត្រ", animals: "ថែសត្វ", guide: "មគ្គុទ្ទេសក៍", cleaning: "សម្អាត" }
    : { all: "Everyone", managers: "Managers", tickets: "Tickets & gate", animals: "Animal care", guide: "Guides", cleaning: "Cleaning" };
  const news = [
    ...fresh.map((m: any) => ({ key: `m:${m.id}`, kind: "chat", channel: m.channel, title: `${person(m.user_id).name} · ${ROOM[m.channel] ?? m.channel}`, body: msgText(m, km).slice(0, 160), avatar: person(m.user_id).avatar, url: `/staff/chat?c=${m.channel}` })),
    ...(s.chime_notices ? (notices ?? []).slice(0, 3).map((n: any) => ({ key: `n:${n.id}`, kind: "notice", channel: null, title: `📢 ${n.title}`, body: String(n.body ?? "").slice(0, 160), avatar: null, url: "/staff" })) : []),
  ];
  const calls = (ringing ?? []).map((c: any) => ({ id: c.id, video: c.video, room: ROOM[c.channel] ?? c.channel, name: person(c.started_by).name, avatar: person(c.started_by).avatar }));
  const mine = (alerts ?? []).filter((a: any) => manager || a.user_id === me.id);
  const ids = [...new Set(mine.map((a: any) => a.user_id).filter(Boolean))];
  const { data: who } = ids.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
  const nameOf = new Map((who ?? []).map((w: any) => [w.user_id, w.full_name]));
  return NextResponse.json(
    {
      allowed: true,
      me: me.id,
      manager,
      alerts: mine.map((a: any) => ({ ...a, own: a.user_id === me.id, name: nameOf.get(a.user_id) ?? "Admin" })),
      chime: [
        ...(s.chime_tasks ? (tasks ?? []).filter((t: any) => t.assigned_to === me.id || (t.section && access.perms.has(t.section))).map((t: any) => `t:${t.id}`) : []),
        ...(s.chime_notices ? (notices ?? []).map((n: any) => `n:${n.id}`) : []),
        ...(msgs ?? []).filter((m: any) => m.user_id !== me.id).map((m: any) => `m:${m.id}`),
        ...(s.chime_manager ? [...(supplies.data ?? []).map((x: any) => `s:${x.id}`), ...(issues.data ?? []).map((x: any) => `i:${x.id}`)] : []),
      ],
      sound: { enabled: s.sound_enabled, volume: s.sound_volume, every: s.siren_every },
      news,
      calls,
      unread: msgs.filter((m: any) => m.user_id !== me.id).length,
    },
    { headers: H }
  );
}
