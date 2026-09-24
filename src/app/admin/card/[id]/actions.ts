"use server";

import { revalidatePath } from "next/cache";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/server/members";

/** Admin only: record that a card was printed, or handed to its owner. */
export async function setCardStatus(userId: string, status: "printed" | "collected") {
  const me = getVerifiedUserId();
  if (!me || (await getCachedRole(me)).role !== "admin") return;
  const [m] = await getMembers(userId);
  if (!m?.card) return;
  await createServiceRoleClient().from("member_cards").upsert({ user_id: userId, card_type: m.card, status, updated_at: new Date().toISOString() });
  revalidatePath(`/admin/card/${userId}`);
  revalidatePath("/admin/members");
}
