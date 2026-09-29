import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { teamOf } from "./roster";
import { sendPush } from "./push";

// When the schedule changes, each team that is affected gets a short message
// in its team chat saying which days changed, so nobody is caught out.

export type Snapshot = Map<string, string>; // "user_day" → shift

export async function snapshot(from: string, to: string): Promise<Snapshot> {
  const { data } = await createServiceRoleClient().from("staff_roster").select("user_id, day, shift").gte("day", from).lte("day", to);
  return new Map((data ?? []).map((r: any) => [`${r.user_id}_${r.day}`, r.shift as string]));
}

/** Compares two snapshots and tells the affected teams which days changed. */
export async function announceChanges(before: Snapshot, after: Snapshot, by: string, why?: string) {
  const changed: { user: string; day: string }[] = [];
  for (const k of new Set([...before.keys(), ...after.keys()])) if (before.get(k) !== after.get(k)) changed.push({ user: k.slice(0, 36), day: k.slice(37) });
  if (!changed.length) return;
  await announce(changed, by, why);
}

export async function announce(changed: { user: string; day: string }[], by: string, why?: string) {
  const db = createServiceRoleClient();
  const { data: staff } = await db.from("staff_members").select("user_id, position:staff_positions(permissions)").in("user_id", [...new Set(changed.map((c) => c.user))]);
  const teamOfUser = new Map((staff ?? []).map((s: any) => [s.user_id, teamOf(s.position?.permissions ?? [])]));
  const byTeam = new Map<string, Set<string>>();
  for (const c of changed) {
    const t = teamOfUser.get(c.user);
    if (!t) continue;
    if (!byTeam.has(t)) byTeam.set(t, new Set());
    byTeam.get(t)!.add(c.day);
  }
  const label = (d: string) => new Intl.DateTimeFormat("km-KH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${d}T12:00:00Z`));
  // each person whose own shifts changed gets it on their phone
  for (const u of new Set(changed.map((c) => c.user))) {
    if (u === by) continue;
    const days = [...new Set(changed.filter((c) => c.user === u).map((c) => c.day))].sort().map(label).join(", ");
    await sendPush([u], { title: "📅 វេនរបស់អ្នកត្រូវបានកែ", body: `ថ្ងៃ ${days}${why ? ` (${why})` : ""} · សូមពិនិត្យកាលវិភាគ`, url: "/staff/roster", tag: "roster" });
  }
  for (const [team, days] of byTeam) {
    const list = [...days].sort().map(label).join(", ");
    await db.from("staff_messages").insert({ channel: team, user_id: by, body: `📅 ជូនដំណឹង៖ កាលវិភាគក្រុមយើងត្រូវបានកែប្រែ សម្រាប់ថ្ងៃ ${list}${why ? ` (${why})` : ""}។ សូមពិនិត្យវេនរបស់អ្នកនៅទំព័រកាលវិភាគ។` });
  }
}
