import { redirect } from "next/navigation";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId, getSessionUser } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { needsSecondStep } from "@/lib/server/mfa";
import { staffAccess } from "@/lib/server/staff";
import { currentPath, isHrAdminPath } from "@/lib/server/staff-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts has already verified the user with Supabase Auth and
  // passed the id along; this layout enforces the *role*. Both checks run on
  // every request — the page never relies on the login form's check.
  const userId = getVerifiedUserId();
  if (!userId) redirect("/admin/login");

  const [profile, me] = await Promise.all([getCachedRole(userId), getSessionUser()]);
  // HR staff: only staff management and payday
  let hrOnly = false;
  if (profile.role !== "admin") {
    const access = profile.role === "staff" ? await staffAccess(userId) : null;
    if (!access?.ok || !access.perms.has("hr")) redirect("/admin/login");
    if (!isHrAdminPath(currentPath())) redirect("/admin/staff");
    hrOnly = true;
  }
  // two-step sign-in: the 6-digit code is still needed for this session
  if (!hrOnly && (await needsSecondStep())) redirect("/admin/mfa");

  return (
    // Phones: the sidebar becomes a top bar + slide-out menu, stacked above
    // the page. Admin pages use p-8 on their root; tighten that on phones.
    <div className="min-h-screen bg-background md:flex">
      <AdminSidebar hrOnly={hrOnly} />
      <div className="min-w-0 flex-1">
        <AdminTopBar name={profile.fullName ?? me?.fullName ?? me?.email ?? "Admin"} email={me?.email ?? null} avatarUrl={me?.avatarUrl ?? null} />
        <div className="overflow-x-hidden max-md:[&>div]:!p-4">{children}</div>
      </div>
    </div>
  );
}
