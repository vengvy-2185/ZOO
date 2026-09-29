import "server-only";
import type { staffAccess } from "./staff";

type Access = Awaited<ReturnType<typeof staffAccess>>;
type Call = { channel: string; to_user: string | null; started_by: string | null };

/** A call to one person: only the two of them. A room call: everyone who can read the room. */
export function mayJoinCall(call: Call, userId: string, access: Access) {
  if (call.to_user) return userId === call.to_user || userId === call.started_by;
  return access.admin || call.channel === "all" || (call.channel === "managers" ? access.perms.has("reports") : access.perms.has(call.channel as any));
}
