import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { buildReport, toCsv, REPORTS, type ReportType } from "@/lib/server/exports";
import { audit } from "@/lib/server/audit";

// Admin: download a month's report as an Excel file (CSV).
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (await getCachedRole(user.id)).role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type") as ReportType;
  const month = u.searchParams.get("month") ?? "";
  if (!(type in REPORTS) || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const report = await buildReport(type, month);
  await audit("report.export", "reports", null, { type, month }, user.id);
  return new NextResponse(toCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gwz-${type}-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
