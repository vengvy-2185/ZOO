import { notFound, redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { canBroadcast, type LiveRow } from "@/lib/server/live";
import { iceServers } from "@/lib/server/ice";
import { getI18n } from "@/lib/i18n/server";
import { LiveHost } from "@/components/live/LiveHost";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("On air", "កំពុងផ្សាយ");

/** The host's screen while live (also used to carry on after the page was closed). */
export default async function HostLive({ params }: { params: { id: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!canBroadcast(access) || !/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const db = createServiceRoleClient();
  const { data } = await db.from("live_streams").select("*").eq("id", params.id).maybeSingle();
  const s = data as LiveRow | null;
  if (!s || (s.started_by !== userId && !access.admin)) notFound();
  if (s.status !== "live") redirect(`/staff/live?ended=${s.id}`);
  const [{ data: comments }, ice] = await Promise.all([
    db.from("live_comments").select("id, name, avatar, staff, body, created_at").eq("stream_id", s.id).eq("hidden", false).order("created_at", { ascending: false }).limit(40),
    iceServers(),
  ]);
  return <LiveHost id={s.id} title={s.title} place={s.place} likes={s.likes} startedAt={s.started_at} comments={(comments ?? []).reverse() as any} ice={ice} km={getI18n().locale === "km"} />;
}
