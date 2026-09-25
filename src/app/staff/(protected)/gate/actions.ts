"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/auth/session";
import { isGateCategory } from "@/lib/data/gate";
import { staffAccess } from "@/lib/server/staff";

/** Adds (or, with a negative delta, corrects) visitors counted at the gate. */
export async function addGateEntry(category: string, delta: number) {
  const userId = getVerifiedUserId();
  if (!userId) throw new Error("Please sign in.");
  if (!(await staffAccess(userId)).perms.has("tickets")) throw new Error("Not allowed for your position.");
  if (!isGateCategory(category) || !Number.isInteger(delta) || delta === 0 || delta < -50 || delta > 500) throw new Error("Invalid count.");
  // Staff session + gate_entries_staff_all RLS policy authorise the insert.
  const { error } = await createClient().from("gate_entries").insert({ category, count: delta, created_by: userId, source: "gate" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/visitors");
}
