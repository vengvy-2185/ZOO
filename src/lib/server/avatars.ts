import { createServiceRoleClient } from "@/lib/supabase/server";

export type Person = { name: string; avatar: string | null; admin: boolean; role: string };

/**
 * Name + photo for a list of people, the same way the rest of the site
 * shows them: a staff photo / uploaded photo first, then the Google or
 * Facebook picture saved on the sign-in account.
 */
export async function peopleFor(ids: string[], km: boolean): Promise<Map<string, Person>> {
  const out = new Map<string, Person>();
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return out;
  const db = createServiceRoleClient();
  const [{ data: profiles }, { data: staff }] = await Promise.all([
    db.from("profiles").select("id, full_name, avatar_url, role").in("id", list),
    db.from("staff_members").select("user_id, full_name, full_name_km, position:staff_positions(name, name_km)").in("user_id", list),
  ]);
  const staffOf = new Map((staff ?? []).map((s: any) => [s.user_id, s]));
  const missing: string[] = [];
  for (const p of profiles ?? []) {
    const s: any = staffOf.get(p.id);
    out.set(p.id, {
      name: (km && s?.full_name_km) || s?.full_name || p.full_name || "Admin",
      avatar: p.avatar_url ?? null,
      admin: p.role === "admin",
      role: p.role === "admin" ? (km ? "អ្នកគ្រប់គ្រងប្រព័ន្ធ" : "Admin") : (km && s?.position?.name_km) || s?.position?.name || "",
    });
    if (!p.avatar_url) missing.push(p.id);
  }
  // pictures that only live on the sign-in account (Google / Facebook)
  await Promise.all(
    missing.slice(0, 30).map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      const m: any = data.user?.user_metadata ?? {};
      const pic = m.custom_avatar_url || m.avatar_url || m.picture || null;
      const cur = out.get(id);
      if (cur && pic) cur.avatar = pic;
      if (cur && cur.name === "Admin" && (m.full_name || m.name)) cur.name = m.full_name || m.name;
    })
  );
  return out;
}
