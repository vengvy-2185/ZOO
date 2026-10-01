import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { monthLabel, paydayById, qrValid } from "@/lib/server/payday";
import { getPositions } from "@/lib/server/staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { ClaimPay } from "@/components/staff/PaydayStaff";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Collect pay", "ទទួលប្រាក់ខែ");

/** Opened from the department QR code (in the app's scanner or the phone camera). */
export default async function ClaimPage({ searchParams }: { searchParams: { p?: string; d?: string; s?: string } }) {
  const access = await staffAccess(getVerifiedUserId()!);
  if (!access.staff) redirect("/staff");
  const km = getI18n().locale === "km";
  const p = await paydayById(String(searchParams.p ?? ""));
  const d = String(searchParams.d ?? "");
  const ok = p && qrValid(p, d, String(searchParams.s ?? ""));
  const pos = ok && d !== "all" ? (await getPositions()).find((x) => x.id === d) : null;
  const month = p?.month.slice(0, 7) ?? "";
  return (
    <StaffShell active="pay" title={km ? "ទទួលប្រាក់ខែ" : "Collect pay"} subtitle={ok ? `${km ? "ផ្នែក" : "Department"}: ${pos ? (km && pos.name_km) || pos.name : km ? "ទាំងអស់" : "All"} · ${new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}` : undefined}>
      <div className="card mx-auto w-full max-w-md p-6">
        {ok ? (
          <ClaimPay km={km} p={p!.id} d={d} s={String(searchParams.s)} month={month} monthName={monthLabel(month, km)} />
        ) : (
          <p className="text-center font-bold text-red-700">{km ? "QR នេះមិនត្រឹមត្រូវទេ។" : "This QR code is not valid."}</p>
        )}
      </div>
    </StaffShell>
  );
}
