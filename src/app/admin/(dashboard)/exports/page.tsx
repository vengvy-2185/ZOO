import { FileSpreadsheet, Printer, CalendarCheck, Wallet, Banknote } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { thisMonth } from "@/lib/server/staff";
import { REPORTS, type ReportType } from "@/lib/server/exports";

export const dynamic = "force-dynamic";

const ICON: Record<ReportType, typeof Wallet> = { attendance: CalendarCheck, payroll: Wallet, cash: Banknote };
const HINT: Record<ReportType, { km: string; en: string }> = {
  attendance: { km: "វត្តមាន មកយឺត អវត្តមាន ច្បាប់ និងការកាត់ប្រាក់ របស់បុគ្គលិកម្នាក់ៗ", en: "Present, late, absent, leave and deductions per person" },
  payroll: { km: "ប្រាក់គោល ឧបត្ថម្ភ បន្ថែម/កាត់ (រួមទាំងការជំនួស) និងប្រាក់ខែសរុប", en: "Base, allowance, bonuses/deductions (with covers) and total pay" },
  cash: { km: "ការបិទបញ្ជីប្រាក់រៀងរាល់ថ្ងៃ៖ ត្រូវមាន រាប់បាន ខុសគ្នា និងស្ថានភាព", en: "Every daily cash close: expected, counted, difference and status" },
};

/** Admin: the month's reports for accounting, as Excel or a printable page (save as PDF). */
export default function ExportsPage({ searchParams }: { searchParams: { month?: string } }) {
  const km = getI18n().locale === "km";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <AdminPageHeader icon={FileSpreadsheet} title={km ? "របាយការណ៍គណនេយ្យ" : "Reports for accounting"} subtitle={km ? "ទាញរបាយការណ៍ប្រចាំខែជា Excel ឬបោះពុម្ព / រក្សាទុកជា PDF។" : "Download the month's reports as Excel, or print / save as PDF."} />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/45">{km ? "ខែ" : "Month"}</span>
          <input type="month" name="month" defaultValue={month} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base" />
        </label>
        <button className="btn-primary px-5 py-2.5">{km ? "បង្ហាញ" : "Show"}</button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(REPORTS) as ReportType[]).map((t) => {
          const Icon = ICON[t];
          return (
            <section key={t} className="card flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-green text-primary"><Icon size={22} /></span>
              <h2 className="mt-3 font-display text-lg font-extrabold text-forest">{km ? REPORTS[t].km : REPORTS[t].en}</h2>
              <p className="mt-1 flex-1 text-sm text-ink/60">{km ? HINT[t].km : HINT[t].en}</p>
              <div className="mt-4 grid gap-2">
                <a href={`/api/admin/export?type=${t}&month=${month}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-forest">
                  <FileSpreadsheet size={16} /> Excel ({month})
                </a>
                <a href={`/admin/print?type=${t}&month=${month}`} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-primary/30 hover:bg-light-green">
                  <Printer size={16} /> {km ? "បោះពុម្ព / PDF" : "Print / PDF"}
                </a>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink/50">{km ? "ឯកសារ Excel បើកបានក្នុង Excel ឬ Google Sheets ជាមួយអក្សរខ្មែរ។ ដើម្បីបាន PDF សូមចុច «បោះពុម្ព / PDF» ហើយជ្រើស «Save as PDF»។" : "The Excel file opens in Excel or Google Sheets with Khmer letters. For a PDF, open “Print / PDF” and choose “Save as PDF”."}</p>
    </div>
  );
}
