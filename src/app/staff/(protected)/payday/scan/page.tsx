import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { PayScanner } from "@/components/staff/PaydayStaff";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Scan to collect pay", "ស្កេនទទួលប្រាក់ខែ");

/** Payday: scan your department's QR code to collect. */
export default async function PayScanPage() {
  const access = await staffAccess(getVerifiedUserId()!);
  if (!access.staff) redirect("/staff/pay");
  const km = getI18n().locale === "km";
  return (
    <StaffShell active="pay" title={km ? "ស្កេនទទួលប្រាក់ខែ" : "Scan to collect pay"} subtitle={km ? "ស្កេន QR នៃផ្នែករបស់អ្នក នៅកន្លែងបើកប្រាក់ខែ។" : "Scan your department's QR code at the pay desk."}>
      <div className="mx-auto w-full max-w-md">
        <PayScanner km={km} />
      </div>
    </StaffShell>
  );
}
