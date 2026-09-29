import { notFound } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { peopleFor } from "@/lib/server/avatars";
import { getI18n } from "@/lib/i18n/server";
import { CallRoom } from "@/components/staff/CallRoom";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Call", "ការហៅ");

const ROOM: Record<string, [string, string]> = {
  all: ["Everyone", "ទាំងអស់គ្នា"],
  managers: ["Managers", "អ្នកគ្រប់គ្រង"],
  tickets: ["Tickets & gate", "សំបុត្រ"],
  animals: ["Animal care", "ថែសត្វ"],
  cleaning: ["Cleaning", "សម្អាត"],
  guide: ["Guides", "មគ្គុទ្ទេសក៍"],
};

/** Where calls connect when two phones can't reach each other directly (optional: TURN_URL / TURN_USERNAME / TURN_CREDENTIAL). */
function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
  const turn = process.env.TURN_URL;
  if (turn) list.push({ urls: turn.split(",").map((u) => u.trim()).filter(Boolean), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  return list;
}

/** A voice / video call in a chat room. */
export default async function CallPage({ params, searchParams }: { params: { id: string }; searchParams: { start?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const { locale } = getI18n();
  const km = locale === "km";
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const db = createServiceRoleClient();
  const { data: call } = await db.from("staff_calls").select("id, channel, video, started_by, created_at, alive_at, ended_at").eq("id", params.id).maybeSingle();
  const can = call && (access.admin || call.channel === "all" || (call.channel === "managers" ? access.perms.has("reports") : access.perms.has(call.channel as any)));
  if (!call || !can) notFound();
  const ended = Boolean(call.ended_at) || Date.parse(call.alive_at) < Date.now() - 60e3;
  // everyone who may show up in this room
  const { data: staff } = await db.from("staff_members").select("user_id").eq("status", "active");
  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  const people = await peopleFor([userId, call.started_by ?? "", ...(staff ?? []).map((s: any) => s.user_id), ...(admins ?? []).map((a: any) => a.id)], km);
  return (
    <CallRoom
      callId={call.id}
      channel={call.channel}
      room={ROOM[call.channel]?.[km ? 1 : 0] ?? call.channel}
      video={call.video}
      startedBy={call.started_by}
      me={userId}
      people={Object.fromEntries(people)}
      km={km}
      ended={ended}
      autoStart={!ended && (searchParams.start === "voice" || searchParams.start === "video") ? (searchParams.start as "voice" | "video") : null}
      ice={iceServers()}
    />
  );
}
