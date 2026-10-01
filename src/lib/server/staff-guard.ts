import "server-only";
import { headers } from "next/headers";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";

// HR staff may use these admin pages (staff management and payday) as the
// admin does. Positions (rates and permissions), settings and everything
// else stay admin-only.
export const HR_ADMIN_PATHS = ["/admin/staff", "/admin/payday", "/admin/card"];
export const isHrAdminPath = (p: string) => HR_ADMIN_PATHS.some((x) => p === x || p.startsWith(`${x}/`) || p.startsWith(`${x}?`));
export const currentPath = () => headers().get("x-gwz-path") ?? "";

/** Permissions only an admin may hand out (so HR can't raise anyone, or themselves). */
export const ELEVATED = ["hr", "reports", "roster"];

/** The admin, or a staff member with the HR permission. */
export async function requireAdminOrHr() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  if ((await getCachedRole(id)).role === "admin") return { id, admin: true as const };
  const access = await staffAccess(id);
  if (access.ok && access.perms.has("hr")) return { id, admin: false as const };
  throw new Error("Admin or HR only.");
}

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
