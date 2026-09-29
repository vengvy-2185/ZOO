"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { canBroadcast } from "@/lib/server/live";
import { sendPush } from "@/lib/server/push";
import { notify, tg } from "@/lib/server/telegram";
import { audit } from "@/lib/server/audit";

async function host() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!canBroadcast(access)) throw new Error("Only media staff can go live.");
  return { id, access };
}

/** Go live: the stream opens, and people who turned notifications on hear about it. */
export async function startLive(_prev: { error?: string; id?: string }, formData: FormData): Promise<{ error?: string; id?: string }> {
  const { id, access } = await host();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const place = String(formData.get("place") ?? "").trim().slice(0, 80);
  if (!title) return { error: "title" };
  const db = createServiceRoleClient();
  // one live at a time per person: an old one left open is closed first
  await db.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("started_by", id).eq("status", "live");
  const { data, error } = await db.from("live_streams").insert({ title, place: place || null, started_by: id }).select("id").single();
  if (error || !data) return { error: error?.message ?? "live" };
  // visitors (and staff) who allowed notifications: at most once every half hour
  const { data: last } = await db.from("live_streams").select("id").neq("id", data.id).gte("started_at", new Date(Date.now() - 30 * 60e3).toISOString()).limit(1);
  if (!last?.length) {
    const { data: subs } = await db.from("push_subscriptions").select("user_id").limit(2000);
    await sendPush([...new Set((subs ?? []).map((s: any) => s.user_id as string))].filter((u) => u !== id), { title: "🔴 LIVE · Green Wild Zoo", body: `${title}${place ? ` · ${place}` : ""} — មកមើលផ្ទាល់ឥឡូវនេះ!`, url: `/live/${data.id}`, tag: "live" });
  }
  await notify("live", `🔴 <b>ផ្សាយផ្ទាល់ចាប់ផ្តើម</b>\n🎥 ${tg(title)}${place ? `\n📍 ${tg(place)}` : ""}\n👤 ${tg(access.staff?.full_name ?? "Admin")}`);
  revalidatePath("/live");
  return { id: data.id };
}

export async function endLive(streamId: string) {
  const { id, access } = await host();
  const db = createServiceRoleClient();
  let q = db.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString(), viewers_now: 0 }).eq("id", streamId).eq("status", "live");
  if (!access.admin) q = q.eq("started_by", id);
  await q;
  revalidatePath("/live");
  revalidatePath("/staff/live");
}

/** Take a rude comment off the screen (the host, admins, managers). */
export async function hideLiveComment(commentId: string) {
  const { id, access } = await host();
  const db = createServiceRoleClient();
  const { data: c } = await db.from("live_comments").select("stream_id, live_streams(started_by)").eq("id", commentId).maybeSingle();
  if (!c) return;
  if (!access.admin && !access.perms.has("reports") && (c as any).live_streams?.started_by !== id) return;
  await db.from("live_comments").update({ hidden: true }).eq("id", commentId);
}

/** Admin: delete an old live from the list. */
export async function removeLive(streamId: string) {
  const { access } = await host();
  if (!access.admin) return;
  await createServiceRoleClient().from("live_streams").delete().eq("id", streamId);
  await audit("live.remove", "live_streams", streamId);
  revalidatePath("/live");
  revalidatePath("/staff/live");
}
