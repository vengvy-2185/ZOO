import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";

// Ticket tools: only positions with the "tickets" permission (and admins).
export const generateMetadata = () => staffTitle("Scanner", "ស្កេន");

export default async function TicketToolLayout({ children }: { children: React.ReactNode }) {
  const access = await staffAccess(getVerifiedUserId() ?? "");
  if (!access.perms.has("tickets")) redirect("/staff?denied=tickets");
  const km = getI18n().locale === "km";
  // the scanner sits inside the normal staff frame, so the menu is always there
  return (
    <StaffShell title={km ? "ស្កេនសំបុត្រ" : "Ticket scanner"} subtitle={km ? "ស្កេន QR សំបុត្រ ដើម្បីឲ្យភ្ញៀវចូល ឬទទួលប្រាក់ KHQR។" : "Scan ticket QR codes to let visitors in, or take a KHQR payment."}>
      {children}
    </StaffShell>
  );
}
