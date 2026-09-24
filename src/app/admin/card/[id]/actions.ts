"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMembers, ensureCard } from "@/lib/server/members";

async function adminId() {
  const me = getVerifiedUserId();
  return me && (await getCachedRole(me)).role === "admin" ? me : null;
}

function refresh(userId: string) {
  revalidatePath(`/admin/card/${userId}`);
  revalidatePath("/admin/members");
}

/** The card was printed (not yet given to its owner). */
export async function markPrinted(userId: string) {
  if (!(await adminId())) return;
  const [m] = await getMembers(userId);
  if (!m?.card) return;
  await ensureCard(m);
  await createServiceRoleClient().from("member_cards").update({ status: "printed", updated_at: new Date().toISOString() }).eq("user_id", userId);
  refresh(userId);
}

/** A printed card was handed to its owner. Can happen again for a replacement; each time is counted. */
export async function handOver(userId: string) {
  const me = await adminId();
  if (!me) return;
  const [m] = await getMembers(userId);
  if (!m?.card) return;
  await ensureCard(m);
  const db = createServiceRoleClient();
  await db.from("member_card_issues").insert({ user_id: userId, card_type: m.card, issued_by: me });
  await db.from("member_cards").update({ status: "collected", updated_at: new Date().toISOString() }).eq("user_id", userId);
  refresh(userId);
}

/** Lost card: give the card a new QR so the old one stops working, ready to print again. */
export async function makeReplacement(userId: string) {
  if (!(await adminId())) return;
  const [m] = await getMembers(userId);
  if (!m?.card) return;
  await ensureCard(m);
  await createServiceRoleClient()
    .from("member_cards")
    .update({ verify_token: randomBytes(12).toString("hex"), status: "ready", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  refresh(userId);
}
