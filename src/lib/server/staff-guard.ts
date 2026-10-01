import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Limits for HR staff (in the staff app's HR pages): they never change their
// own record, a manager's or another HR's — only the admin can.

/** Permissions only an admin may hand out (so HR can't raise anyone, or themselves). */
export const ELEVATED = ["hr", "reports", "roster"];

/** HR (not admin) may not touch their own record or anyone with elevated rights, nor give elevated rights. */
export async function hrMayManage(actor: { id: string; admin: boolean }, targetUserId: string | null, positionId?: string | null) {
  if (actor.admin) return true;
  if (targetUserId && targetUserId === actor.id) return false;
  const db = createServiceRoleClient();
  if (targetUserId) {
    const { data: t } = await db.from("staff_members").select("position:staff_positions(permissions)").eq("user_id", targetUserId).maybeSingle();
    if (((t as any)?.position?.permissions ?? []).some((p: string) => ELEVATED.includes(p))) return false;
  }
  if (positionId) {
    const { data: pos } = await db.from("staff_positions").select("permissions").eq("id", positionId).maybeSingle();
    if ((pos?.permissions ?? []).some((p: string) => ELEVATED.includes(p))) return false;
  }
  return true;
}
