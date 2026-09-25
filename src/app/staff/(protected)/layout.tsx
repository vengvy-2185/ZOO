import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";

// middleware.ts verifies the user with Supabase Auth and forwards the id;
// this layout is what actually enforces access: admins, or staff whose
// account is active (a suspended/left staff member is turned away here on
// every request, even with an old session).
export default async function StaffProtectedLayout({ children }: { children: React.ReactNode }) {
  const userId = getVerifiedUserId();
  if (!userId) redirect("/staff/login");
  const access = await staffAccess(userId);
  if (!access.ok) redirect("/staff/login");
  return <>{children}</>;
}
