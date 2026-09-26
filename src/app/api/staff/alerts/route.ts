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

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ allowed: false }, { headers: H });
  const access = await staffAccess(me.id);
  if (!access.ok) return NextResponse.json({ allowed: false }, { headers: H });
  const manager = access.admin || access.perms.has("reports");
  const db = createServiceRoleClient();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [s, { data: alerts }, { data: tasks }, { data: notices }, supplies, issues] = await Promise.all([
    getStaffSettings(),
    db.from("staff_alerts").select("id, user_id, kind, place, note, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    db.from("staff_tasks").select("id, assigned_to, section").eq("status", "open").limit(200),
    db.from("staff_announcements").select("id").gte("created_at", since).limit(20),
    manager ? db.from("staff_supply_requests").select("id").eq("status", "pending").limit(50) : Promise.resolve({ data: [] as any[] }),
    manager ? db.from("staff_issues").select("id").eq("status", "open").limit(50) : Promise.resolve({ data: [] as any[] }),
  ]);
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
        ...(s.chime_manager ? [...(supplies.data ?? []).map((x: any) => `s:${x.id}`), ...(issues.data ?? []).map((x: any) => `i:${x.id}`)] : []),
      ],
      sound: { enabled: s.sound_enabled, volume: s.sound_volume, every: s.siren_every },
    },
    { headers: H }
  );
}
