import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().regex(/^[a-f0-9]{16,64}$/i),
  sessionId: z.string().uuid().nullish(),
});

const POINTS = 10;

/**
 * Records an Animal Quest discovery. The visitor must send the secret token
 * from the QR sign beside the enclosure; the animal is looked up from that
 * token on the server, so points can't be earned without really scanning it.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const { token } = parsed.data;
  const admin = createServiceRoleClient();

  const { data: qr } = await admin
    .from("animal_qr_codes")
    .select("animal_id, animals(id, name, khmer_name, animal_code, main_image_url, status, species:species_id(common_name, khmer_name))")
    .eq("qr_token", token.toLowerCase())
    .maybeSingle();
  const animal: any = qr && [qr.animals].flat()[0];
  if (!animal || animal.status !== "active") return NextResponse.json({ ok: false, reason: "invalid" }, { status: 404 });

  // The visitor's quest session: reuse theirs if it is really theirs, else start one.
  const {
    data: { user },
  } = await createClient().auth.getUser();
  let sessionId = parsed.data.sessionId ?? null;
  if (sessionId) {
    const { data: s } = await admin.from("quest_sessions").select("id, visitor_id").eq("id", sessionId).maybeSingle();
    if (!s || (s.visitor_id && s.visitor_id !== user?.id)) sessionId = null;
    else if (!s.visitor_id && user) await admin.from("quest_sessions").update({ visitor_id: user.id }).eq("id", s.id);
  }
  if (!sessionId) {
    const { data: s, error } = await admin.from("quest_sessions").insert({ visitor_id: user?.id ?? null }).select("id").single();
    if (error || !s) return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
    sessionId = s.id;
  }

  await admin.rpc("increment_qr_scan", { p_animal_id: animal.id });
  const { data: award } = await admin.rpc("add_quest_discovery", { p_session_id: sessionId, p_animal_id: animal.id, p_points: POINTS });
  const row = [award].flat()[0] as { awarded: boolean; total_points: number } | undefined;

  // Progress, plus a suggestion for the next animal to look for.
  const [{ data: found }, { data: all }] = await Promise.all([
    admin.from("quest_discoveries").select("animal_id").eq("session_id", sessionId),
    admin.from("animals").select("id, name, khmer_name, animal_code, main_image_url").eq("status", "active"),
  ]);
  const foundIds = new Set((found ?? []).map((f) => f.animal_id));
  const left = (all ?? []).filter((a) => !foundIds.has(a.id));
  const next = left.length ? left[Math.floor(Math.random() * left.length)] : null;
  const sp: any = [animal.species].flat()[0];

  return NextResponse.json(
    {
      ok: true,
      sessionId,
      awarded: !!row?.awarded,
      points: POINTS,
      totalPoints: row?.total_points ?? 0,
      found: foundIds.size,
      total: all?.length ?? 0,
      animal: {
        id: animal.id,
        code: animal.animal_code,
        name: animal.name,
        name_km: animal.khmer_name,
        species: sp?.common_name ?? null,
        species_km: sp?.khmer_name ?? null,
        image: animal.main_image_url,
      },
      next: next && { code: next.animal_code, name: next.name, name_km: next.khmer_name, image: next.main_image_url },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
