import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { staffAccess } from "./staff";

// Live video from the zoo. A stream is "on air" while its host's phone keeps
// saying so (every 15 s); a phone that died counts as ended after a minute.

export type LiveRow = {
  id: string;
  title: string;
  place: string | null;
  started_by: string | null;
  status: "live" | "ended";
  started_at: string;
  alive_at: string;
  ended_at: string | null;
  viewers_now: number;
  peak_viewers: number;
  likes: number;
  comments: number;
};

export const onAir = (s: Pick<LiveRow, "status" | "alive_at">) => s.status === "live" && Date.parse(s.alive_at) > Date.now() - 60e3;

/** Who may go live: admins and staff with the "media" permission. */
export const canBroadcast = (access: Awaited<ReturnType<typeof staffAccess>>) => access.ok && (access.admin || access.perms.has("media"));

export async function liveNow(): Promise<LiveRow | null> {
  const { data } = await createServiceRoleClient()
    .from("live_streams")
    .select("*")
    .eq("status", "live")
    .gte("alive_at", new Date(Date.now() - 60e3).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LiveRow) ?? null;
}

export async function recentLives(limit = 20): Promise<LiveRow[]> {
  const { data } = await createServiceRoleClient().from("live_streams").select("*").order("started_at", { ascending: false }).limit(limit);
  return (data ?? []) as LiveRow[];
}

/** The name and photo shown next to a comment. */
export async function commenter(userId: string) {
  const db = createServiceRoleClient();
  const [{ data: p }, { data: s }] = await Promise.all([
    db.from("profiles").select("full_name, avatar_url, role").eq("id", userId).maybeSingle(),
    db.from("staff_members").select("full_name, full_name_km").eq("user_id", userId).maybeSingle(),
  ]);
  let name = s?.full_name_km || s?.full_name || p?.full_name || "";
  let avatar = p?.avatar_url ?? null;
  if (!name || !avatar) {
    const { data } = await db.auth.admin.getUserById(userId);
    const m: any = data.user?.user_metadata ?? {};
    name ||= m.full_name || m.name || (data.user?.email ?? "Guest").split("@")[0];
    avatar ||= m.avatar_url || m.picture || null;
  }
  return { name: name.slice(0, 60), avatar, staff: p?.role === "admin" || p?.role === "staff" };
}
