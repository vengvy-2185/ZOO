"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, openShift } from "@/lib/server/staff";

// Staff actions run with the service role, so each one first checks who is
// signed in and what their position allows.

async function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.ok) throw new Error("Not allowed.");
  return { id, access };
}

export async function clockIn() {
  const { id, access } = await me();
  if (!access.staff) return; // admins don't clock in
  if (await openShift(id)) return;
  await createServiceRoleClient().from("staff_attendance").insert({ user_id: id });
  revalidatePath("/staff");
}

export async function clockOut() {
  const { id } = await me();
  const open = await openShift(id);
  if (!open) return;
  await createServiceRoleClient().from("staff_attendance").update({ clock_out: new Date().toISOString() }).eq("id", open.id);
  revalidatePath("/staff");
}

const KINDS = ["feeding", "health", "cleaning", "enrichment", "note"];
export async function addCareLog(formData: FormData) {
  const { id, access } = await me();
  if (!access.perms.has("animals")) throw new Error("Not allowed for your position.");
  const animalId = String(formData.get("animal_id") ?? "");
  const kind = String(formData.get("kind") ?? "note");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!animalId || !note || !KINDS.includes(kind)) return;
  await createServiceRoleClient().from("animal_care_logs").insert({ animal_id: animalId, user_id: id, kind, note });
  revalidatePath("/staff/animals");
}
