import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { canBroadcast, commenter } from "@/lib/server/live";
import { allow, tooMany } from "@/lib/server/rate-limit";

// One live stream:
//   alive   (the host's phone, every 15 s): still on air + how many watch
//   comment (anyone signed in): a comment everyone sees at once
//   like    (anyone): hearts, sent in small batches
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const db = createServiceRoleClient();
  const { data: s } = await db.from("live_streams").select("id, status, started_by, peak_viewers").eq("id", params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "like") {
    // one heart per viewer: their account, or (for guests) the device they watch on
    if (s.status !== "live") return NextResponse.json({ ok: true, counted: false });
    if (!(await allow("live-like", 20, 60))) return tooMany();
    const user = await getSessionUser();
    const device = String(body.device ?? "");
    if (!user && !/^[0-9a-f-]{36}$/i.test(device)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data: counted } = await db.rpc("live_like", { p_stream: s.id, p_liker: user ? `u:${user.id}` : `d:${device.toLowerCase()}` });
    return NextResponse.json({ ok: true, counted: Boolean(counted) });
  }

  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "signin" }, { status: 401 });

  if (body.action === "comment") {
    if (s.status !== "live") return NextResponse.json({ error: "ended" }, { status: 409 });
    const text = String(body.body ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (!(await allow("live-comment", 8, 30, me.id))) return tooMany();
    const who = await commenter(me.id);
    const { error } = await db.from("live_comments").insert({ stream_id: s.id, user_id: me.id, name: who.name || "Guest", avatar: who.avatar, staff: who.staff, body: text });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.rpc("live_bump", { p_stream: s.id, p_likes: 0, p_comments: 1 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "alive" || body.action === "end") {
    const access = await staffAccess(me.id);
    if (!canBroadcast(access) || (s.started_by !== me.id && !access.admin)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    const viewers = Math.max(0, Math.min(100000, Math.round(Number(body.viewers) || 0)));
    const now = new Date().toISOString();
    if (body.action === "end") await db.from("live_streams").update({ status: "ended", ended_at: now, viewers_now: 0 }).eq("id", s.id);
    else await db.from("live_streams").update({ alive_at: now, viewers_now: viewers, peak_viewers: Math.max(s.peak_viewers ?? 0, viewers) }).eq("id", s.id).eq("status", "live");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
