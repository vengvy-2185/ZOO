import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { buildReport, REPORTS, type ReportType } from "@/lib/server/exports";
import { audit } from "@/lib/server/audit";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

/** A clean, printable report page (the browser saves it as PDF). Admins only. */
export default async function PrintReportPage({ searchParams }: { searchParams: { type?: string; month?: string } }) {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") redirect("/admin/login");
  const type = searchParams.type as ReportType;
  const month = searchParams.month ?? "";
  if (!(type in REPORTS) || !/^\d{4}-\d{2}$/.test(month)) redirect("/admin/exports");
  const r = await buildReport(type, month);
  await audit("report.export", "reports", null, { type, month, as: "print" });
  const made = new Intl.DateTimeFormat("km-KH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date());
  return (
    <div className="min-h-screen bg-white p-6 text-[#111] print:p-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; } @media print { .no-print, .fixed { display: none !important; } }`}</style>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <a href="/admin/exports" className="text-sm font-bold text-[#176B3A]">← ត្រឡប់</a>
        <PrintButton />
      </div>
      <header className="mb-4 flex items-end justify-between border-b-2 border-[#176B3A] pb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#176B3A]">Green Wild Zoo</p>
          <h1 className="text-2xl font-extrabold">{r.title}</h1>
        </div>
        <p className="text-xs text-black/55">បង្កើតនៅ {made}</p>
      </header>
      {r.rows.length === 0 ? (
        <p className="py-10 text-center text-black/50">គ្មានទិន្នន័យសម្រាប់ខែនេះទេ។</p>
      ) : (
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {r.columns.map((c) => (
                <th key={c} className="border border-black/20 bg-[#EEF6EE] px-2 py-1.5 text-left font-bold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i} className="even:bg-black/[0.02]">
                {row.map((v, j) => (
                  <td key={j} className={`border border-black/15 px-2 py-1 ${typeof v === "number" ? "text-right tabular-nums" : ""}`}>{typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {r.totals && (
            <tfoot>
              <tr>
                {r.totals.map((v, j) => (
                  <td key={j} className={`border border-black/25 bg-[#F4F4F4] px-2 py-1.5 font-extrabold ${typeof v === "number" ? "text-right tabular-nums" : ""}`}>{typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      )}
      <div className="mt-10 grid grid-cols-2 gap-16 text-center text-xs">
        <div><div className="mb-1 h-12 border-b border-black/40" />រៀបចំដោយ</div>
        <div><div className="mb-1 h-12 border-b border-black/40" />ពិនិត្យ និងអនុម័តដោយ</div>
      </div>
    </div>
  );
}
