import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";

// Animal care log: only positions with the "animals" permission (and admins).
export default async function AnimalToolLayout({ children }: { children: React.ReactNode }) {
  const access = await staffAccess(getVerifiedUserId() ?? "");
  if (!access.perms.has("animals")) redirect("/staff?denied=animals");
  return <>{children}</>;
}
