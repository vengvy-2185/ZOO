import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { needsSecondStep } from "@/lib/server/mfa";
import { appUnlocked, pinRow } from "@/lib/server/pin";
import { getI18n } from "@/lib/i18n/server";
import { PinLock, PinSetup } from "@/components/staff/PinPad";

// middleware.ts verifies the user with Supabase Auth and forwards the id;
// this layout is what actually enforces access: admins, or staff whose
// account is active (a suspended/left staff member is turned away here on
// every request, even with an old session).
export default async function StaffProtectedLayout({ children }: { children: React.ReactNode }) {
  const userId = getVerifiedUserId();
  if (!userId) redirect("/staff/login");
  const access = await staffAccess(userId);
  if (!access.ok) redirect("/staff/login");
  // an admin with two-step sign-in must enter the code here too
  if (access.admin && (await needsSecondStep())) redirect("/admin/mfa?next=/staff");
  // staff: a secret code is required (it also guards their pay); the app can
  // ask for it every time it opens (they may turn that off)
  if (access.staff) {
    const km = getI18n().locale === "km";
    const name = access.staff.full_name_km || access.staff.full_name;
    const pin = await pinRow(userId);
    if (!pin) return <PinSetup km={km} name={name} />;
    if (pin.lock_on_open && !appUnlocked(userId)) return <PinLock km={km} name={name} />;
  }
  return <>{children}</>;
}
