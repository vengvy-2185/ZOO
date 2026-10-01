import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock3 } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle, PAY_TYPE, type PayType } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import type { SlipDetail } from "@/lib/server/payday";
import { StaffShell } from "@/components/staff/StaffShell";
import { PrintButton } from "@/components/staff/PrintButton";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Payslip", "វិក្កយបត្រប្រាក់ខែ");
const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;

/** One month's payslip, for the person themselves only: what was earned, what was taken off, and how it was collected. */
export default async function SlipPage({ params }: { params: { month: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  if (!access.staff) redirect("/staff");
  if (!/^\d{4}-\d{2}$/.test(params.month)) notFound();
  const km = getI18n().locale === "km";
  const L = (en: string, k: string) => (km ? k : en);
  const { data: s } = await createServiceRoleClient().from("staff_payslips").select("*").eq("user_id", userId).eq("month", `${params.month}-01`).maybeSingle();
  if (!s) notFound();
  const me = access.staff;
  const d: SlipDetail = s.detail ?? {
    position: me.position?.name ?? null,
    position_km: me.position?.name_km ?? null,
    pay_type: s.pay_type,
    rate: Number(s.rate),
    units: Number(s.units),
    days: 0,
    hours: 0,
    base: Number(s.base),
    allowance: Number(s.allowance),
    adjustments: Number(s.adjustments) ? [{ note: L("Bonus / deduction", "ប្រាក់រង្វាន់ / កាត់"), amount: Number(s.adjustments) }] : [],
    attendance: { late: 0, absent: 0, deduction: 0 },
    leave_days: 0,
  };
  const pt = PAY_TYPE[(d.pay_type as PayType) ?? "monthly"] ?? PAY_TYPE.monthly;
  const unit = km ? pt.unit.km : pt.unit.en;
  const bonuses = d.adjustments.filter((a) => a.amount > 0);
  const cuts = d.adjustments.filter((a) => a.amount < 0);
  const earned = d.base + d.allowance + bonuses.reduce((t, a) => t + a.amount, 0);
  const taken = d.attendance.deduction + cuts.reduce((t, a) => t - a.amount, 0);
  const received = s.received_at || !s.payday_id;
  const monthName = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${params.month}-01T00:00:00Z`));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const VIA: Record<string, [string, string]> = { scan: ["QR scan", "ស្កេន QR"], manual: ["In person", "ផ្ទាល់ដៃ"], proxy: ["Collected by someone else", "អ្នកផ្សេងទទួលជំនួស"], transfer: ["Bank transfer", "ផ្ទេរតាមធនាគារ"] };
  const no = `GWZ-PAY-${params.month.replace("-", "")}-${me.staff_no.replace(/^GWZ-S-/, "")}`;

  const Line = ({ label, sub, amount, minus }: { label: string; sub?: string; amount: number; minus?: boolean }) => (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-ink/75">{label}{sub && <span className="block text-xs text-ink/45">{sub}</span>}</span>
      <span className={cn("font-display font-extrabold tabular-nums", minus ? "text-red-600" : "text-forest")}>{minus ? "−" : ""}{usd(amount)}</span>
    </div>
  );

  return (
    <StaffShell active="pay" title={L("Payslip", "វិក្កយបត្រប្រាក់ខែ")} subtitle={monthName}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <Link href="/staff/pay" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ChevronLeft size={16} /> {L("Pay", "ប្រាក់ខែ")}</Link>
          <PrintButton label={L("Print / save PDF", "បោះពុម្ព / រក្សាជា PDF")} />
        </div>

        <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-black/5 print:shadow-none">
          {/* header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-forest via-primary to-[#1D9A5B] p-6 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/logo-sm.png" alt="" width={52} height={52} className="rounded-2xl bg-white p-1" />
                <div>
                  <p className="font-display text-lg font-extrabold leading-tight">Green Wild Zoo</p>
                  <p className="text-xs text-white/75">{L("Payslip", "វិក្កយបត្រប្រាក់ខែ")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">{L("No.", "លេខ")}</p>
                <p className="font-mono text-xs font-bold">{no}</p>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-white/75">{L("Net pay", "ប្រាក់ទទួលបានសុទ្ធ")} · {monthName}</p>
                <p className="font-display text-5xl font-extrabold tabular-nums">{usd(Number(s.gross))}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold", received ? "bg-white text-emerald-700" : "bg-amber-300 text-amber-950")}>
                {received ? <CheckCircle2 size={14} /> : <Clock3 size={14} />} {received ? L("Collected", "បានទទួល") : L("Not collected yet", "មិនទាន់ទទួល")}
              </span>
            </div>
          </div>

          {/* who */}
          <div className="grid grid-cols-2 gap-4 border-b border-black/5 p-6 text-sm sm:grid-cols-4">
            {[
              [L("Name", "ឈ្មោះ"), (km && me.full_name_km) || me.full_name],
              [L("Staff ID", "លេខសម្គាល់"), me.staff_no],
              [L("Position", "តួនាទី"), (km && d.position_km) || d.position || "—"],
              [L("Period", "រយៈពេល"), monthName],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{k}</p>
                <p className="mt-0.5 font-bold text-forest">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            {/* earned */}
            <section>
              <h3 className="mb-1 text-xs font-extrabold uppercase tracking-wider text-emerald-700">{L("Earnings", "ប្រាក់ចំណូល")}</h3>
              <div className="divide-y divide-black/5 text-sm">
                <Line label={L("Base pay", "ប្រាក់គោល")} sub={`${km ? pt.km : pt.en} · ${usd(d.rate)} × ${d.units} ${unit}`} amount={d.base} />
                {d.allowance > 0 && <Line label={L("Allowance", "ប្រាក់ឧបត្ថម្ភ")} amount={d.allowance} />}
                {bonuses.map((a, i) => <Line key={i} label={L("Bonus", "ប្រាក់រង្វាន់")} sub={a.note} amount={a.amount} />)}
              </div>
              <div className="mt-1 flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800"><span>{L("Total earned", "ចំណូលសរុប")}</span><span className="tabular-nums">{usd(earned)}</span></div>
            </section>

            {/* taken off */}
            <section>
              <h3 className="mb-1 text-xs font-extrabold uppercase tracking-wider text-red-600">{L("Deductions", "ការកាត់ប្រាក់")}</h3>
              <div className="divide-y divide-black/5 text-sm">
                <Line label={L("Attendance", "វត្តមាន")} sub={km ? `យឺត ${d.attendance.late} ដង · អវត្តមាន ${d.attendance.absent} វេន` : `${d.attendance.late} late · ${d.attendance.absent} missed sessions`} amount={d.attendance.deduction} minus={d.attendance.deduction > 0} />
                {cuts.map((a, i) => <Line key={i} label={L("Deduction", "កាត់ប្រាក់")} sub={a.note} amount={-a.amount} minus />)}
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <span className="text-ink/75">{L("Approved leave", "ច្បាប់ដែលបានអនុម័ត")}<span className="block text-xs text-ink/45">{L("not deducted", "មិនកាត់ប្រាក់")}</span></span>
                  <span className="font-bold text-ink/60">{d.leave_days} {L("days", "ថ្ងៃ")}</span>
                </div>
              </div>
              <div className="mt-1 flex justify-between rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700"><span>{L("Total deducted", "កាត់សរុប")}</span><span className="tabular-nums">−{usd(taken)}</span></div>
            </section>
          </div>

          {/* net */}
          <div className="mx-6 flex items-center justify-between rounded-2xl bg-forest px-5 py-4 text-white">
            <span className="font-display text-lg font-extrabold">{L("Net pay", "ប្រាក់ទទួលបានសុទ្ធ")}</span>
            <span className="font-display text-3xl font-extrabold tabular-nums">{usd(Number(s.gross))}</span>
          </div>
          <p className="mx-6 mt-2 text-right text-xs text-ink/45">{usd(earned)} − {usd(taken)} = {usd(Number(s.gross))}</p>

          {/* collected */}
          <div className="m-6 mt-4 rounded-2xl border border-dashed border-black/10 p-4 text-sm">
            {received ? (
              <p className="flex items-start gap-2 text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> <span><b className="whitespace-nowrap">{L("Collected", "បានទទួល")}</b>{s.received_at ? ` · ${when(s.received_at)}` : ""}{s.received_via ? ` · ${VIA[s.received_via]?.[km ? 1 : 0] ?? ""}` : ""}</span></p>
            ) : (
              <p className="flex items-start gap-2 text-amber-700"><Clock3 size={18} className="mt-0.5 flex-shrink-0" /> {L("Not collected yet: scan your department's QR code on payday.", "មិនទាន់ទទួល៖ សូមស្កេន QR នៃផ្នែករបស់អ្នក នៅថ្ងៃបើកប្រាក់ខែ។")}</p>
            )}
            <p className="mt-2 text-xs text-ink/45">{L("Issued", "ចេញនៅ")} {when(s.paid_at)} · {L("Questions about this payslip? Ask the admin or HR.", "មានសំណួរអំពីវិក្កយបត្រនេះ? សូមសួរ Admin ឬ HR។")}</p>
          </div>
        </article>
      </div>
    </StaffShell>
  );
}
