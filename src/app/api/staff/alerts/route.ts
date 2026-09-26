import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
    db.from("staff_announcements").select("id").gte("created_at", since).limit(20),
    manager ? db.from("staff_supply_requests").select("id").eq("status", "pending").limit(50) : Promise.resolve({ data: [] as any[] }),
    manager ? db.from("staff_issues").select("id").eq("status", "open").limit(50) : Promise.resolve({ data: [] as any[] }),
  ]);
  // chat messages from others in my channels, last 2 hours
  const channels = ["all", ...(manager ? ["managers"] : []), ...(["tickets", "animals", "cleaning", "guide"] as const).filter((c) => access.admin || access.perms.has(c))];
  const [{ data: msgRows }, { data: reads }] = await Promise.all([
    db.from("staff_messages").select("id, user_id, channel, created_at").in("channel", channels).gte("created_at", new Date(Date.now() - 2 * 3600e3).toISOString()).limit(60),
    db.from("staff_chat_reads").select("channel, last_read_at").eq("user_id", me.id),
  ]);
  const readAt = new Map((reads ?? []).map((r: any) => [r.channel, Date.parse(r.last_read_at)]));
  // only messages I haven't read yet
  const msgs = (msgRows ?? []).filter((m: any) => Date.parse(m.created_at) > (readAt.get(m.channel) ?? 0));
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
    },
    { headers: H }
  );
}
