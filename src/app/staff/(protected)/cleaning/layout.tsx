import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";

// Only positions with the "cleaning" permission (and admins).
export default async function ToolLayout({ children }: { children: React.ReactNode }) {
  const access = await staffAccess(getVerifiedUserId() ?? "");
  if (!access.perms.has("cleaning")) redirect("/staff?denied=cleaning");
  return <>{children}</>;
}
