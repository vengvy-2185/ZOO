import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { inDm } from "@/lib/chat-dm";

// The open chat asks every few seconds what changed (a safety net under the
// live connection, which can be slow or drop): new messages, which of the
// latest messages still exist, reactions, who read up to where, and the
// last message + unread count of each room for the list.
export const dynamic = "force-dynamic";
const ROOMS = ["all", "managers", "tickets", "animals", "cleaning", "guide", "hr"];

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const access = await staffAccess(me.id);
  if (!access.ok) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "all";
  const after = u.searchParams.get("after");
  const can = (ch: string) => access.admin || ch === "all" || (ch === "managers" ? access.perms.has("reports") : access.perms.has(ch as any));
  if (!(ROOMS.includes(c) && can(c)) && !inDm(c, me.id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const db = createServiceRoleClient();
  // my private chats (rooms named after both people)
  const { data: dmRows } = await db.from("staff_messages").select("channel").like("channel", `dm:%${me.id}%`).order("created_at", { ascending: false }).limit(400);
  const myDms = [...new Set([...((dmRows ?? []) as any[]).map((r) => r.channel as string), ...(inDm(c, me.id) ? [c] : [])])].filter((x) => inDm(x, me.id));
  const mine = [...ROOMS.filter(can), ...myDms];
  const since = after && Number.isFinite(Date.parse(after)) ? after : new Date(Date.now() - 60e3).toISOString();
  const [{ data: fresh }, { data: latest }, { data: reads }, { data: myReads }, { data: recent }] = await Promise.all([
    db.from("staff_messages").select("*").eq("channel", c).gt("created_at", since).order("created_at").limit(100),
    db.from("staff_messages").select("id, created_at").eq("channel", c).order("created_at", { ascending: false }).limit(80),
    db.from("staff_chat_reads").select("user_id, last_read_at").eq("channel", c),
    db.from("staff_chat_reads").select("channel, last_read_at").eq("user_id", me.id),
    db.from("staff_messages").select("id, channel, user_id, body, kind, files, audio_url, meta, created_at").in("channel", mine).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(400),
  ]);
  const ids = (latest ?? []).map((m: any) => m.id);
  const { data: reacts } = ids.length ? await db.from("staff_message_reactions").select("message_id, user_id, emoji").in("message_id", ids) : { data: [] as any[] };
  const reactions: Record<string, { user_id: string; emoji: string }[]> = {};
  for (const id of ids) reactions[id] = [];
  for (const r of reacts ?? []) reactions[r.message_id].push({ user_id: r.user_id, emoji: r.emoji });
  // for the room list
  const readAt = new Map((myReads ?? []).map((r: any) => [r.channel, Date.parse(r.last_read_at)]));
  const last: Record<string, any> = {};
  const unread: Record<string, number> = {};
  for (const m of recent ?? []) {
    last[m.channel] ??= m;
    if (m.user_id !== me.id && Date.parse(m.created_at) > (readAt.get(m.channel) ?? 0)) unread[m.channel] = (unread[m.channel] ?? 0) + 1;
  }
  return NextResponse.json(
    {
      msgs: fresh ?? [],
      // the latest messages that still exist (anything else in that window was deleted)
      window: { ids, from: (latest ?? []).at(-1)?.created_at ?? null, to: latest?.[0]?.created_at ?? null },
      reactions,
      reads: Object.fromEntries((reads ?? []).map((r: any) => [r.user_id, r.last_read_at])),
      last,
      unread,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
