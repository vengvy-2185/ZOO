import { redirect } from "next/navigation";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId } from "@/lib/auth/session";

// middleware.ts verifies the user with Supabase Auth and forwards the id;
// this layout is what actually enforces the staff/admin role — necessary
// because Google OAuth sign-in bypasses the role check in the login form.
export default async function StaffProtectedLayout({ children }: { children: React.ReactNode }) {
  const userId = getVerifiedUserId();
  if (!userId) redirect("/staff/login");

  const { role } = await getCachedRole(userId);
  if (role !== "staff" && role !== "admin") redirect("/staff/login");

  return <>{children}</>;
}
