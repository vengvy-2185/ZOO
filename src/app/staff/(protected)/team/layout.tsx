import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";

// Team attendance: admins and managers ("reports" permission) only.
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const access = await staffAccess(getVerifiedUserId() ?? "");
  if (!access.admin && !access.perms.has("reports")) redirect("/staff?denied=reports");
  return <>{children}</>;
}
