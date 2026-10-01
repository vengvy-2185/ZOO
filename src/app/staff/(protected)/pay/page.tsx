import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Wallet, HandCoins, ScanLine, CalendarClock, MapPin, FileText, Clock3, ChevronRight, AlertCircle } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, payroll, thisMonth, PAY_TYPE, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { currentPayday, ensurePaydays, monthLabel, paydayFor, requestDeadline, today } from "@/lib/server/payday";
import { PayRequestForm, CancelRequest } from "@/components/staff/PaydayStaff";
import { RevealPay } from "@/components/staff/PinPad";
import { payRevealed } from "@/lib/server/pin";
import { salarySteps, salaryNow } from "@/lib/server/salary";

export const dynamic = "force-dynamic";
const usd = (n: number) => `$${n.toFixed(2)}`;

/** This month's pay worked out line by line, and past payslips. */
export const generateMetadata = () => staffTitle("Pay", "ប្រាក់ខែ");

export default async function PayPage({ searchParams }: { searchParams: { month?: string } }) {
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
  // amounts only go into the page after the secret code (5 minutes)
  const shown = payRevealed(userId);
  const money = (n: number) => (shown ? usd(n) : "$ ••••");
  const sal = salaryNow((await salarySteps([userId])).get(userId), Number(p?.rate ?? 0), today());
  // payday: the open / coming one, my payslip for it and my request
  await ensurePaydays();
  // ?month=2026-10 opens that month's payday (links from notifications); otherwise the one that matters now
  const pd = (/^\d{4}-\d{2}$/.test(searchParams?.month ?? "") ? await paydayFor(searchParams.month!) : null) ?? (await currentPayday(userId));
  const db = createServiceRoleClient();
  const [{ data: pdSlip }, { data: myReq }] = pd
    ? await Promise.all([
        db.from("staff_payslips").select("gross, received_at, received_via").eq("user_id", userId).eq("month", pd.month).maybeSingle(),
        db.from("staff_payday_requests").select("*").eq("payday_id", pd.id).eq("user_id", userId).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const now = today();
  const daysLeft = pd ? Math.round((Date.parse(pd.pay_date) - Date.parse(now)) / 864e5) : 0;
  const canAsk = pd && pd.status !== "closed" && now <= requestDeadline(pd) && !pdSlip?.received_at;
  const longDate = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const METHOD: Record<string, [string, string]> = { later: ["Collect later", "មកយកពេលក្រោយ"], proxy: ["Someone collects", "អ្នកផ្សេងយកជំនួស"], transfer: ["Bank transfer", "ផ្ទេរតាមធនាគារ"] };
  const monthName = (m: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));
  const unit = p ? (km ? PAY_TYPE[p.pay_type].unit.km : PAY_TYPE[p.pay_type].unit.en) : "";
  const L = km
    ? { title: "ប្រាក់ខែ", sub: "របៀបគិតប្រាក់ខែខែនេះ និងប្រាក់ខែដែលបានបើកពីមុន។", now: "ខែនេះ", base: "ប្រាក់គោល", allowance: "ប្រាក់ឧបត្ថម្ភ", adj: "ប្រាក់រង្វាន់ / កាត់", total: "សរុប", est: "ប៉ាន់ស្មាន (មិនទាន់បើក)", paid: "បានបើក", history: "ប្រាក់ខែដែលបានបើក", none: "មិនទាន់មានទេ។", rate: "អត្រា" }
    : { title: "Pay", sub: "How this month's pay is worked out, and past payslips.", now: "This month", base: "Base pay", allowance: "Allowance", adj: "Bonus / deduction", total: "Total", est: "Estimate (not paid yet)", paid: "Paid", history: "Payslips", none: "None yet.", rate: "Rate" };

  return (
    <StaffShell active="pay" title={L.title} subtitle={L.sub}>
      <div className={`flex items-center gap-3 rounded-2xl p-3 text-sm ring-1 ${shown ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-white text-ink/70 ring-black/5"}`}>
        <span className="flex-1">{shown ? (km ? "ប្រាក់ខែកំពុងបង្ហាញ (៥ នាទី)" : "Pay is shown (5 minutes)") : km ? "ប្រាក់ខែត្រូវបានលាក់ · បញ្ចូលលេខកូដរបស់អ្នក ដើម្បីមើល" : "Your pay is hidden · enter your code to see it"}</span>
        <RevealPay km={km} shown={shown} />
      </div>
      {pd && (pd.status !== "closed" || (pdSlip && !pdSlip.received_at)) && (
        <section className="card overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-forest via-primary to-[#1D9A5B] p-5 text-white md:p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <p className="relative flex items-center gap-2 text-sm font-bold text-white/80"><HandCoins size={17} /> {km ? "ថ្ងៃបើកប្រាក់ខែ" : "Payday"}</p>
            <p className="relative mt-1 font-display text-3xl font-extrabold">{km ? "ប្រាក់ខែ" : "Pay for"} {monthLabel(pd.month, km)}</p>
            <p className="relative mt-1 text-lg font-bold text-white/90">{km ? "បើកនៅ" : "Handed out on"} {longDate(pd.pay_date)}</p>
            <p className="relative mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
              {pd.start_time && <span className="inline-flex items-center gap-1"><CalendarClock size={14} /> {pd.start_time.slice(0, 5)}{pd.end_time ? `–${pd.end_time.slice(0, 5)}` : ""}</span>}
              {pd.place && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {pd.place}</span>}
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{daysLeft > 0 ? (km ? `នៅសល់ ${daysLeft} ថ្ងៃ` : `in ${daysLeft} days`) : daysLeft === 0 ? (km ? "ថ្ងៃនេះ" : "today") : km ? "បានកន្លងផុត" : "passed"}</span>
            </p>
            {pd.note && <p className="relative mt-2 text-sm text-white/80">{pd.note}</p>}
          </div>
          <div className="space-y-4 p-5 md:p-6">
            {pdSlip?.received_at ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                <CheckCircle2 size={28} className="flex-shrink-0 text-emerald-600" />
                <div className="flex-1"><p className="font-display text-xl font-extrabold text-emerald-800">{km ? "បានទទួលប្រាក់ខែ" : "Pay collected"} · {money(Number(pdSlip.gross))}</p></div>
              </div>
            ) : pd.status === "open" && daysLeft <= 0 && pdSlip ? (
              <Link href="/staff/payday/scan" className="flex items-center gap-4 rounded-2xl bg-primary p-4 text-white shadow-lift transition active:scale-[.98]">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15"><ScanLine size={30} /></span>
                <span className="flex-1"><span className="block font-display text-xl font-extrabold">{km ? "ស្កេន QR ដើម្បីទទួលប្រាក់" : "Scan the QR to collect"}</span><span className="text-sm text-white/80">{money(Number(pdSlip.gross))} · {km ? "ស្កេន QR នៃផ្នែករបស់អ្នក" : "your department's code"}</span></span>
                <ChevronRight size={22} />
              </Link>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink/60"><Clock3 size={16} className="text-primary" /> {pd.status === "scheduled" ? (km ? "នៅថ្ងៃបើកប្រាក់ខែ ចុចស្កេន QR នៃផ្នែករបស់អ្នក ដើម្បីទទួលប្រាក់។" : "On payday, scan your department's QR code here to collect.") : km ? "សូមទាក់ទង Admin ដើម្បីទទួលប្រាក់។" : "Please see the admin to collect."}</p>
            )}
            {pdSlip && (
              <Link href={`/staff/pay/slip/${pd.month.slice(0, 7)}`} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3 font-bold text-forest hover:bg-light-green">
                <FileText size={18} className="text-primary" /> <span className="flex-1">{km ? "មើលវិក្កយបត្រប្រាក់ខែរបស់ខ្ញុំ" : "See my payslip"}</span> <ChevronRight size={18} />
              </Link>
            )}
            {myReq ? (
              <div className="rounded-2xl bg-cream/60 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-forest">{km ? "សំណើរបស់ខ្ញុំ" : "My request"}</b>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${myReq.status === "approved" ? "bg-emerald-100 text-emerald-800" : myReq.status === "rejected" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"}`}>{myReq.status === "approved" ? (km ? "បានយល់ព្រម" : "Approved") : myReq.status === "rejected" ? (km ? "មិនយល់ព្រម" : "Refused") : km ? "រង់ចាំ Admin" : "Waiting for admin"}</span>
                </div>
                <p className="mt-1 text-ink/70">{myReq.kind === "leave" ? (km ? "ឈប់សម្រាក/ច្បាប់" : "On leave") : km ? "មកមិនបាន" : "Can't come"} · {METHOD[myReq.method][km ? 1 : 0]}{myReq.pickup_date ? ` · ${myReq.pickup_date.split("-").reverse().join("/")}` : ""}{myReq.proxy_name ? ` · ${myReq.proxy_name}` : ""}</p>
                <p className="text-ink/55">{myReq.reason}</p>
                {myReq.admin_note && <p className="mt-1 text-xs text-ink/55">↳ {myReq.admin_note}</p>}
                {myReq.status === "pending" && <div className="mt-2"><CancelRequest km={km} paydayId={pd.id} /></div>}
              </div>
            ) : canAsk ? (
              <details className="group rounded-2xl ring-1 ring-black/10">
                <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-bold text-forest"><AlertCircle size={17} className="text-amber-600" /> <span className="flex-1">{km ? "មកមិនបាន ឬមានច្បាប់នៅថ្ងៃនោះ?" : "Can't come, or on leave that day?"}</span><ChevronRight size={18} className="transition group-open:rotate-90" /></summary>
                <div className="px-4 pb-4">
                  <p className="mb-3 text-xs text-ink/55">{km ? `សូមផ្ញើសំណើទៅ Admin យ៉ាងតិច ៤ ថ្ងៃមុន (ត្រឹម ${longDate(requestDeadline(pd))})។` : `Send it to the admin at least 4 days before (by ${longDate(requestDeadline(pd))}).`}</p>
                  <PayRequestForm km={km} paydayId={pd.id} payDate={pd.pay_date} />
                </div>
              </details>
            ) : pd.status !== "closed" && !pdSlip?.received_at ? (
              <p className="text-xs text-ink/45">{km ? "ពេលផ្ញើសំណើ (មកមិនបាន/ច្បាប់) បានផុតហើយ (ត្រូវផ្ញើ ៤ ថ្ងៃមុន)។ សូមទាក់ទង Admin ផ្ទាល់។" : "The time for requests has passed (4 days before). Please talk to the admin."}</p>
            ) : null}
          </div>
        </section>
      )}
      {pay && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-2 bg-gradient-to-br from-[#EEF2FF] to-white p-5 md:p-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-ink/55"><Wallet size={16} className="text-[#1D4ED8]" /> {L.now} · {monthName(thisMonth())}</p>
              <p className="mt-1 font-display text-5xl font-extrabold text-forest">{money(pay.payslip?.gross ?? pay.gross)}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${pay.payslip ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {pay.payslip ? (pdSlip && pd?.month.slice(0, 7) === thisMonth() && !pdSlip.received_at ? (km ? "វិក្កយបត្ររួចរាល់" : "Payslip ready") : `✓ ${L.paid}`) : L.est}
            </span>
          </div>
          <dl className="divide-y divide-black/5 text-sm">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6">
              <dt className="text-ink/65">
                {L.base}
                <span className="block text-xs text-ink/45">
                  {p ? `${km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en}: ${money(pay.rate)} × ${pay.units} ${unit}` : "—"}
                </span>
              </dt>
              <dd className="font-display font-extrabold text-forest">{money(pay.base)}</dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 md:px-6">
              <dt className="text-ink/65">{L.allowance}</dt>
              <dd className="font-display font-extrabold text-forest">{money(pay.allowance)}</dd>
            </div>
            {pay.adjustments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6">
                <dt className="text-ink/65">{L.adj}<span className="block text-xs text-ink/45">{a.note}</span></dt>
                <dd className={`font-display font-extrabold ${a.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>{a.amount > 0 ? "+" : ""}{money(a.amount)}</dd>
              </div>
            ))}
            {pay.attendance.deduction > 0 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6">
                <dt className="text-ink/65">{km ? "កាត់តាមវត្តមាន" : "Attendance deduction"}<span className="block text-xs text-ink/45">{km ? `យឺត ${pay.attendance.late} ដង · អវត្តមាន ${pay.attendance.absent} វេន` : `${pay.attendance.late} late · ${pay.attendance.absent} missed sessions`}</span></dt>
                <dd className="font-display font-extrabold text-red-600">−{money(pay.attendance.deduction)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between bg-[#EEF2FF] px-5 py-4 md:px-6">
              <dt className="font-display font-extrabold text-[#1E3A8A]">{L.total}</dt>
              <dd className="font-display text-xl font-extrabold text-[#1E3A8A]">{money(pay.payslip?.gross ?? pay.gross)}</dd>
            </div>
          </dl>
        </section>
      )}
      {p && (
        <section className="card flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-green text-primary"><Wallet size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink/50">{km ? "ប្រាក់ខែរបស់ខ្ញុំ" : "My salary"} · {km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en}</p>
            <p className="font-display text-2xl font-extrabold text-forest">{money(sal.current)}</p>
            {sal.next && <p className="text-xs font-bold text-emerald-700">↗ {km ? "នឹងដំឡើងទៅ" : "Rises to"} {money(sal.next.amount)} {km ? "ចាប់ពី" : "from"} {sal.next.effective_from.split("-").reverse().join("/")}{sal.next.note ? ` · ${sal.next.note}` : ""}</p>}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.history}</h2>
        <div className="card divide-y divide-black/5">
          {(slips ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/55">{L.none}</p>
          ) : (
            (slips ?? []).map((s: any) => (
              <Link key={s.id} href={`/staff/pay/slip/${String(s.month).slice(0, 7)}`} className="flex items-center gap-3 p-4 transition hover:bg-cream/60">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.received_at || !s.payday_id ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{s.received_at || !s.payday_id ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</span>
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-forest"><CalendarDays size={14} className="text-[#1D4ED8]" /> {monthName(s.month)}</span>
                  <span className="text-xs text-ink/50">{L.base} {money(Number(s.base))} · {L.allowance} {money(Number(s.allowance))} · {L.adj} {money(Number(s.adjustments))}</span>
                </span>
                <span className="font-display text-lg font-extrabold text-forest">{money(Number(s.gross))}</span>
                <ChevronRight size={18} className="text-ink/30" />
              </Link>
            ))
          )}
        </div>
      </section>
    </StaffShell>
  );
}
