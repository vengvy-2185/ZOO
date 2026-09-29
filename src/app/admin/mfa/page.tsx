import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { needsSecondStep } from "@/lib/server/mfa";
import { MfaVerify } from "@/components/admin/MfaSecurity";

export const dynamic = "force-dynamic";

/** Second step of the admin sign-in: the 6-digit code from the phone app. */
export default async function MfaPage({ searchParams }: { searchParams: { next?: string } }) {
  if (!getVerifiedUserId()) redirect("/admin/login");
  const next = searchParams.next === "/staff" ? "/staff" : "/admin";
  if (!(await needsSecondStep())) redirect(next);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <MfaVerify next={next} />
    </div>
  );
}
