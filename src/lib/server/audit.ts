import "server-only";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

// The activity log: who changed what, and when. Shown to admins on
// /admin/activity. Writing it never stops the action itself.

export type AuditAction =
  | "roster.edit" | "roster.plan" | "roster.copy" | "roster.rules" | "roster.approve" | "roster.refuse" | "roster.dayoff"
  | "staff.create" | "staff.update" | "staff.password" | "staff.account"
  | "pay.adjust" | "pay.adjust.remove" | "pay.paid" | "pay.unpaid" | "position.save" | "position.delete"
  | "leave.decide" | "cash.review" | "report.export" | "settings.staff" | "settings.payment" | "settings.telegram" | "settings.tts" | "settings.site" | "settings.scratch"
  | "settings.shop_payment" | "settings.turn" | "shop.product" | "shop.stock" | "shop.cancel" | "live.remove";

export async function audit(action: AuditAction, table: string, id?: string | null, meta?: Record<string, unknown>, actorId?: string) {
  try {
    // pages and actions know the signed-in person from the request; API routes pass it
    const actor = actorId ?? getVerifiedUserId();
    await createServiceRoleClient()
      .from("audit_logs")
      .insert({ actor_id: actor ?? null, action, entity_table: table, entity_id: id && /^[0-9a-f-]{36}$/i.test(id) ? id : null, metadata: meta ?? null });
  } catch (e) {
    console.warn("audit:", action, e);
  }
}
