import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, payroll, thisMonth, PAY_TYPE, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";

export const dynamic = "force-dynamic";
const usd = (n: number) => `$${n.toFixed(2)}`;

/** This month's pay worked out line by line, and past payslips. */
export const generateMetadata = () => staffTitle("Pay", "ប្រាក់ខែ");

export default async function PayPage() {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!access.staff) redirect("/staff");
  const { locale } = getI18n();
  const km = locale === "km";
  const [[pay], { data: slips }] = await Promise.all([
    payroll(thisMonth(), userId),
    createServiceRoleClient().from("staff_payslips").select("*").eq("user_id", userId).order("month", { ascending: false }).limit(12),
  ]);
  const p = access.staff.position;
  const monthName = (m: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));
  const unit = p ? (km ? PAY_TYPE[p.pay_type].unit.km : PAY_TYPE[p.pay_type].unit.en) : "";
  const L = km
    ? { title: "ប្រាក់ខែ", sub: "របៀបគិតប្រាក់ខែខែនេះ និងប្រាក់ខែដែលបានបើកពីមុន។", now: "ខែនេះ", base: "ប្រាក់គោល", allowance: "ប្រាក់ឧបត្ថម្ភ", adj: "ប្រាក់រង្វាន់ / កាត់", total: "សរុប", est: "ប៉ាន់ស្មាន (មិនទាន់បើក)", paid: "បានបើក", history: "ប្រាក់ខែដែលបានបើក", none: "មិនទាន់មានទេ។", rate: "អត្រា" }
    : { title: "Pay", sub: "How this month's pay is worked out, and past payslips.", now: "This month", base: "Base pay", allowance: "Allowance", adj: "Bonus / deduction", total: "Total", est: "Estimate (not paid yet)", paid: "Paid", history: "Payslips", none: "None yet.", rate: "Rate" };

  return (
    <StaffShell active="pay" title={L.title} subtitle={L.sub}>
      {pay && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-2 bg-gradient-to-br from-[#EEF2FF] to-white p-5 md:p-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-ink/55"><Wallet size={16} className="text-[#1D4ED8]" /> {L.now} · {monthName(thisMonth())}</p>
              <p className="mt-1 font-display text-5xl font-extrabold text-forest">{usd(pay.payslip?.gross ?? pay.gross)}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${pay.payslip ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {pay.payslip ? `✓ ${L.paid}` : L.est}
            </span>
          </div>
          <dl className="divide-y divide-black/5 text-sm">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6">
              <dt className="text-ink/65">
                {L.base}
                <span className="block text-xs text-ink/45">
                  {p ? `${km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en}: ${usd(p.rate)} × ${pay.units} ${unit}` : "—"}
                </span>
              </dt>
              <dd className="font-display font-extrabold text-forest">{usd(pay.base)}</dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 md:px-6">
              <dt className="text-ink/65">{L.allowance}</dt>
              <dd className="font-display font-extrabold text-forest">{usd(pay.allowance)}</dd>
            </div>
            {pay.adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6">
                <dt className="text-ink/65">{L.adj}<span className="block text-xs text-ink/45">{a.note}</span></dt>
                <dd className={`font-display font-extrabold ${a.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>{a.amount > 0 ? "+" : ""}{usd(a.amount)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between bg-[#EEF2FF] px-5 py-4 md:px-6">
              <dt className="font-display font-extrabold text-[#1E3A8A]">{L.total}</dt>
              <dd className="font-display text-xl font-extrabold text-[#1E3A8A]">{usd(pay.payslip?.gross ?? pay.gross)}</dd>
            </div>
          </dl>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.history}</h2>
        <div className="card divide-y divide-black/5">
          {(slips ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/55">{L.none}</p>
          ) : (
            (slips ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></span>
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-forest"><CalendarDays size={14} className="text-[#1D4ED8]" /> {monthName(s.month)}</span>
                  <span className="text-xs text-ink/50">{L.base} {usd(Number(s.base))} · {L.allowance} {usd(Number(s.allowance))} · {L.adj} {usd(Number(s.adjustments))}</span>
                </span>
                <span className="font-display text-lg font-extrabold text-forest">{usd(Number(s.gross))}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </StaffShell>
  );
}
