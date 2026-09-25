import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";

// Only positions with the "tickets" permission (and admins).
export default async function ToolLayout({ children }: { children: React.ReactNode }) {
  const access = await staffAccess(getVerifiedUserId() ?? "");
  if (!access.perms.has("tickets")) redirect("/staff?denied=tickets");
  return <>{children}</>;
}
