import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { mayJoinCall } from "@/lib/server/call-access";

// People in a call say "still here" every 20 seconds; the last one leaving
// (or closing the page, sent with sendBeacon) ends it. A call nobody keeps
// alive counts as ended after a minute, even if nobody said so.
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const access = await staffAccess(me.id);
  if (!access.ok) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const db = createServiceRoleClient();
  const { data: c } = await db.from("staff_calls").select("channel, ended_at, to_user, started_by").eq("id", id).maybeSingle();
  const can = c && mayJoinCall(c, me.id, access);
  if (!can) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (c.ended_at) return NextResponse.json({ ended: true });
  const now = new Date().toISOString();
  if (body.action === "end") await db.from("staff_calls").update({ ended_at: now }).eq("id", id).is("ended_at", null);
  else await db.from("staff_calls").update({ alive_at: now }).eq("id", id).is("ended_at", null);
  return NextResponse.json({ ok: true });
}
