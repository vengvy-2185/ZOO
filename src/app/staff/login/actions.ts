"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isStaffNo } from "@/lib/server/staff";

export type StaffLoginState = { error?: "invalid" | "inactive" | "busy"; ok?: boolean };

// Staff sign in with their Staff ID (GWZ-S-0001) and password, never an
// email. The ID is looked up on the server to find the internal account;
// a wrong ID and a wrong password give the same answer.
export async function staffSignIn(_prev: StaffLoginState, formData: FormData): Promise<StaffLoginState> {
  const staffNo = String(formData.get("staff_no") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  if (!isStaffNo(staffNo) || password.length < 6) return { error: "invalid" };

  const db = createServiceRoleClient();
  const { data: staff } = await db.from("staff_members").select("user_id, status").eq("staff_no", staffNo).maybeSingle();
  if (!staff) return { error: "invalid" };
  if (staff.status !== "active") return { error: "inactive" };
  const { data: u } = await db.auth.admin.getUserById(staff.user_id);
  const email = u?.user?.email;
  if (!email) return { error: "invalid" };

  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) return { error: /rate|too many/i.test(error.message) ? "busy" : "invalid" };
  return { ok: true };
}
