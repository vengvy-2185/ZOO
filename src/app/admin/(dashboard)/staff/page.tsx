import Link from "next/link";
import { BadgeCheck, Briefcase, Wallet, Users, Printer, Clock, Trash2, CheckCircle2, Undo2, Plus, CalendarOff, Megaphone, Pin, PinOff, XCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
import { getI18n } from "@/lib/i18n/server";
import { getPositions, payroll, thisMonth, PERMISSIONS, PAY_TYPE, type PayLine, type Position } from "@/lib/server/staff";
import { cn } from "@/lib/utils/cn";
import { AttendanceManager, type AttTab } from "@/components/staff/AttendanceManager";
import { ClipboardCheck } from "lucide-react";
import { AddStaffForm, ResetPassword } from "./StaffClient";
import { leaveUsage } from "@/lib/server/staff";
import { updateStaff, savePosition, addAdjustment, removeAdjustment, markPaid, unmarkPaid, decideLeave, postNotice, deleteNotice, togglePin } from "./actions";

export const dynamic = "force-dynamic";

const TABS = ["people", "attendance", "payroll", "leave", "notices", "positions"] as const;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export default async function AdminStaffPage({ searchParams }: { searchParams: { tab?: string; month?: string; at?: string; sess?: string; q?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? searchParams.tab! : "people";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const db = createServiceRoleClient();
  const [positions, lines, { data: leaves }, { data: notices }] = await Promise.all([
    getPositions(),
    payroll(month),
    db.from("staff_leave_requests").select("*").order("status", { ascending: false }).order("start_date", { ascending: false }).limit(60),
    db.from("staff_announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30),
  ]);
  const pendingLeaves = (leaves ?? []).filter((r: any) => r.status === "pending");
  // leave used this year vs the allowance, per person (shown on each request)
  const leaveUse = tab === "leave" ? new Map(await Promise.all([...new Set((leaves ?? []).map((r: any) => r.user_id as string))].map(async (id) => [id, await leaveUsage(id, lines.find((l) => l.staff.user_id === id)?.staff.leave_quota)] as const))) : new Map();
  const staffName = (id: string) => lines.find((l) => l.staff.user_id === id)?.staff.full_name ?? "—";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const pn = (p: Position | null) => (p ? (km && p.name_km) || p.name : "—");
  const active = lines.filter((l) => l.staff.status === "active");
  const total = lines.reduce((s, l) => s + l.gross, 0);
  const paid = lines.filter((l) => l.payslip).reduce((s, l) => s + (l.payslip?.gross ?? 0), 0);
  const onShift = lines.filter((l) => l.openShift).length;
  const monthLabel = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const shift = (d: number) => {
    const [y, m] = month.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const L = km
    ? { title: "បុគ្គលិក និងប្រាក់ខែ", sub: "មានតែអ្នកគ្រប់គ្រងទេដែលបង្កើតគណនីបុគ្គលិក។ បុគ្គលិកម្នាក់ៗទទួលបានលេខសម្គាល់ (GWZ-S-…) សម្រាប់ចូលប្រើ និងកាតសម្គាល់ភ្លាមៗ។", tabs: { people: "បុគ្គលិក", attendance: "វត្តមាន", payroll: "ប្រាក់ខែ", leave: "ច្បាប់", notices: "ជូនដំណឹង", positions: "តួនាទី និងអត្រា" }, staff: "បុគ្គលិកសកម្ម", shift: "កំពុងធ្វើការឥឡូវ", total: "ប្រាក់ខែសរុបខែនេះ", paid: "បានបើករួច", pos: "តួនាទី", status: "ស្ថានភាព", st: { active: "សកម្ម", suspended: "ផ្អាក", left: "លាឈប់" }, month: "ខែនេះ", card: "កាត", edit: "កែប្រែ", save: "រក្សាទុក", saving: "កំពុងរក្សាទុក…", none: "មិនទាន់មានបុគ្គលិកទេ។ បន្ថែមម្នាក់ខាងលើ។", days: "ថ្ងៃ", hours: "ម៉ោង", base: "ប្រាក់គោល", allowance: "ឧបត្ថម្ភ", adj: "បន្ថែម/កាត់", gross: "សរុប", markPaid: "បានបើកប្រាក់", undo: "មិនទាន់", paidOn: "បានបើក", bonus: "ប្រាក់រង្វាន់ / កាត់", note: "មូលហេតុ", add: "បន្ថែម", rate: "អត្រា", payType: "របៀបគិតប្រាក់", perms: "អាចប្រើ", newPos: "តួនាទីថ្មី", del: "លុប", phone: "ទូរស័ព្ទ", allowanceM: "ឧបត្ថម្ភ/ខែ", onShiftNow: "កំពុងធ្វើការ" }
    : { title: "Staff and payroll", sub: "Only admins create staff accounts. Each person gets a Staff ID (GWZ-S-…) to sign in with and an ID card straight away.", tabs: { people: "Staff", attendance: "Attendance", payroll: "Payroll", leave: "Leave", notices: "Notices", positions: "Positions and pay" }, staff: "Active staff", shift: "Working right now", total: "Payroll this month", paid: "Already paid", pos: "Position", status: "Status", st: { active: "Active", suspended: "Suspended", left: "Left" }, month: "This month", card: "Card", edit: "Edit", save: "Save", saving: "Saving…", none: "No staff yet. Add someone above.", days: "days", hours: "hours", base: "Base", allowance: "Allowance", adj: "Bonus/deduction", gross: "Total", markPaid: "Mark paid", undo: "Undo", paidOn: "Paid", bonus: "Bonus / deduction", note: "Reason", add: "Add", rate: "Rate", payType: "Pay type", perms: "Can use", newPos: "New position", del: "Delete", phone: "Phone", allowanceM: "Allowance/month", onShiftNow: "On shift" };

  const units = (l: PayLine) => {
    const t = l.staff.position?.pay_type;
    return t === "daily" ? `${l.days} ${L.days}` : t === "hourly" ? `${l.hours} ${L.hours}` : `${l.days} ${L.days} · ${l.hours} ${L.hours}`;
  };

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader icon={BadgeCheck} title={L.title} subtitle={L.sub} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Users, label: L.staff, value: String(active.length), tone: "bg-primary text-white" },
          { icon: Clock, label: L.shift, value: String(onShift), tone: "bg-white" },
          { icon: Wallet, label: `${L.total} (${monthLabel})`, value: usd(total), tone: "bg-white" },
          { icon: CheckCircle2, label: L.paid, value: usd(paid), tone: "bg-white" },
        ].map((c) => (
          <div key={c.label} className={cn("rounded-3xl p-4 shadow-soft ring-1 ring-black/5", c.tone)}>
            <c.icon size={18} className={c.tone.includes("primary") ? "text-leaf" : "text-primary"} />
            <p className="mt-2 font-display text-2xl font-extrabold">{c.value}</p>
            <p className={cn("text-xs", c.tone.includes("primary") ? "text-white/75" : "text-ink/55")}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {TABS.map((k) => (
          <Link key={k} href={`/admin/staff?tab=${k}&month=${month}`} className={cn("flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold", tab === k ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10 hover:bg-light-green")}>
            {k === "people" ? <Users size={15} className="-mt-0.5 mr-1.5 inline" /> : k === "payroll" ? <Wallet size={15} className="-mt-0.5 mr-1.5 inline" /> : k === "attendance" ? <ClipboardCheck size={15} className="-mt-0.5 mr-1.5 inline" /> : k === "leave" ? <CalendarOff size={15} className="-mt-0.5 mr-1.5 inline" /> : k === "notices" ? <Megaphone size={15} className="-mt-0.5 mr-1.5 inline" /> : <Briefcase size={15} className="-mt-0.5 mr-1.5 inline" />}
            {L.tabs[k]}
            {k === "leave" && pendingLeaves.length > 0 && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs font-extrabold text-forest">{pendingLeaves.length}</span>}
          </Link>
        ))}
      </div>

      {tab === "people" && (
        <div className="space-y-5">
          <AddStaffForm positions={positions} km={km} today={today} />
          {lines.length === 0 ? (
            <p className="card p-8 text-center text-ink/55">{L.none}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {lines.map((l) => {
                const s = l.staff;
                const p = s.position;
                return (
                  <div key={s.user_id} className={cn("card overflow-hidden", s.status !== "active" && "opacity-70")}>
                    <div className="flex items-center gap-3 p-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold text-white" style={{ background: p?.color ?? "#64748B" }}>
                        {[...s.full_name][0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-extrabold text-forest">
                          {s.full_name} {s.full_name_km && <span className="font-khmer text-sm font-semibold text-ink/50">· {s.full_name_km}</span>}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink/55">
                          <span className="font-mono font-bold text-primary">{s.staff_no}</span>
                          <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: p?.color ?? "#64748B" }}>{pn(p)}</span>
                          <span className={cn("rounded-full px-2 py-0.5 font-bold", s.status === "active" ? "bg-light-green text-primary" : "bg-red-50 text-red-700")}>{L.st[s.status]}</span>
                          {l.openShift && <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {L.onShiftNow}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-extrabold text-forest">{usd(l.gross)}</p>
                        <p className="text-[11px] text-ink/50">{L.month} · {units(l)}</p>
                      </div>
                    </div>
                    <details className="border-t border-black/5 bg-cream/60">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-bold text-primary">
                        <span>{L.edit}</span>
                        <span className="flex items-center gap-2">
                          <Link href={`/admin/card/${s.user_id}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-forest ring-1 ring-black/10">
                            <Printer size={13} /> {L.card}
                          </Link>
                          <ResetPassword userId={s.user_id} km={km} />
                        </span>
                      </summary>
                      <form action={updateStaff.bind(null, s.user_id)} className="grid gap-3 p-4 pt-1 sm:grid-cols-2">
                        <input name="full_name" defaultValue={s.full_name} className={input} />
                        <input name="full_name_km" defaultValue={s.full_name_km ?? ""} placeholder="ឈ្មោះជាខ្មែរ" className={input} />
                        <select name="position_id" defaultValue={s.position_id ?? ""} className={input}>
                          {positions.map((x) => (
                            <option key={x.id} value={x.id}>{pn(x)}</option>
                          ))}
                        </select>
                        <select name="status" defaultValue={s.status} className={input}>
                          {(["active", "suspended", "left"] as const).map((k) => (
                            <option key={k} value={k}>{L.st[k]}</option>
                          ))}
                        </select>
                        <input name="phone" defaultValue={s.phone ?? ""} placeholder={L.phone} className={input} />
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45">{L.allowanceM} ($)</span>
                          <input name="allowance" type="number" step="0.5" min="0" defaultValue={s.allowance} className={input} title={L.allowanceM} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45">{km ? "ច្បាប់អនុញ្ញាត (ដង/ឆ្នាំ)" : "Leave allowed (times/year)"}</span>
                          <input name="leave_quota" type="number" min="0" max="365" step="1" defaultValue={s.leave_quota ?? 12} className={input} />
                        </label>
                        <div className="sm:col-span-2 flex justify-end">
                          <SubmitButton label={L.save} pendingLabel={L.saving} />
                        </div>
                      </form>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "attendance" && (
        <AttendanceManager
          tab={(["today", "month", "rules"].includes(searchParams.at ?? "") ? searchParams.at : "today") as AttTab}
          month={searchParams.month}
          km={km}
          base="/admin/staff?tab=attendance"
          sess={searchParams.sess}
          q={searchParams.q}
        />
      )}

      {tab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Link href={`/admin/staff?tab=payroll&month=${shift(-1)}`} aria-label="previous month" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest ring-1 ring-black/10 hover:bg-light-green">←</Link>
            <span className="min-w-[10rem] rounded-full bg-forest px-5 py-2 text-center font-display font-extrabold text-white">{monthLabel}</span>
            <Link href={`/admin/staff?tab=payroll&month=${shift(1)}`} aria-label="next month" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest ring-1 ring-black/10 hover:bg-light-green">→</Link>
          </div>
          {lines.length === 0 && <p className="card p-8 text-center text-ink/55">{L.none}</p>}
          <div className="grid gap-4 xl:grid-cols-2">
            {lines.map((l) => {
              const p = l.staff.position;
              return (
                <div key={l.staff.user_id} className="card overflow-hidden">
                  {/* who + total */}
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold text-white" style={{ background: p?.color ?? "#64748B" }}>
                      {[...l.staff.full_name][0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-extrabold text-forest">{l.staff.full_name}</p>
                      <p className="truncate text-xs text-ink/55">
                        <span className="font-mono font-bold text-primary">{l.staff.staff_no}</span> · {pn(p)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {p ? `${km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en} ${usd(p.rate)}` : "—"} · {units(l)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{L.gross}</p>
                      <p className="font-display text-2xl font-extrabold leading-tight text-forest">{usd(l.payslip?.gross ?? l.gross)}</p>
                    </div>
                  </div>

                  {/* breakdown */}
                  <div className="mx-4 grid grid-cols-3 gap-2 rounded-2xl bg-cream p-2 text-center">
                    {[
                      [L.base, usd(l.base), ""],
                      [L.allowance, usd(l.allowance), ""],
                      [L.adj, `${l.adjTotal > 0 ? "+" : ""}${usd(l.adjTotal)}`, l.adjTotal < 0 ? "text-red-600" : l.adjTotal > 0 ? "text-emerald-600" : ""],
                    ].map(([k, v, c]) => (
                      <div key={k} className="rounded-xl bg-white px-2 py-2 shadow-soft">
                        <p className="truncate text-[11px] text-ink/50">{k}</p>
                        <p className={cn("font-display text-sm font-extrabold", c)}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {l.attendance.deduction > 0 && (
                    <p className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                      <span>{km ? `វត្តមាន៖ យឺត ${l.attendance.late} ដង · អវត្តមាន ${l.attendance.absent} វេន` : `Attendance: ${l.attendance.late} late · ${l.attendance.absent} missed`}</span>
                      <span>−{usd(l.attendance.deduction)}</span>
                    </p>
                  )}
                  {/* bonuses / deductions */}
                  {l.adjustments.length > 0 && (
                    <ul className="mx-4 mt-3 space-y-1.5">
                      {l.adjustments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-black/5">
                          <span className={cn("font-mono text-xs font-bold", a.amount < 0 ? "text-red-600" : "text-emerald-600")}>{a.amount > 0 ? "+" : ""}{usd(a.amount)}</span>
                          <span className="min-w-0 flex-1 truncate text-ink/65">{a.note}</span>
                          {!l.payslip && (
                            <form action={removeAdjustment.bind(null, a.id)}>
                              <button className="p-1 text-ink/35 hover:text-red-600" aria-label="remove"><Trash2 size={14} /></button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 border-t border-black/5 bg-cream/60 p-4">
                    {!l.payslip && (
                      <form action={addAdjustment.bind(null, l.staff.user_id, month)} className="mb-3 grid grid-cols-[3.75rem_5.5rem_1fr] gap-2 sm:grid-cols-[3.75rem_5.5rem_1fr_auto]">
                        <select name="sign" className={input} aria-label={L.bonus}>
                          <option value="+">+</option>
                          <option value="-">−</option>
                        </select>
                        <input name="amount" type="number" step="0.5" min="0" placeholder="$" className={input} required />
                        <input name="note" placeholder={L.note} className={input} required />
                        <button className="col-span-3 inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white sm:col-span-1">
                          <Plus size={13} /> {L.add}
                        </button>
                      </form>
                    )}
                    {l.payslip ? (
                      <form action={unmarkPaid.bind(null, l.staff.user_id, month)} className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-light-green px-3 py-2 text-xs font-extrabold text-primary">
                          <CheckCircle2 size={15} /> {L.paidOn} {new Date(l.payslip.paid_at).toLocaleDateString("en-GB", { timeZone: "Asia/Phnom_Penh" })}
                        </span>
                        <button className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-ink/45 hover:text-red-600"><Undo2 size={14} /> {L.undo}</button>
                      </form>
                    ) : (
                      <form action={markPaid.bind(null, l.staff.user_id, month)}>
                        <SubmitButton label={`${L.markPaid} · ${usd(l.gross)}`} pendingLabel="…" className="w-full py-2.5 text-sm" />
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "leave" && (() => {
        const K = km ? { annual: "ច្បាប់ប្រចាំឆ្នាំ", sick: "ឈឺ", personal: "កិច្ចការផ្ទាល់ខ្លួន", other: "ផ្សេងៗ" } : { annual: "Annual leave", sick: "Sick", personal: "Personal", other: "Other" };
        const S = km ? { pending: "កំពុងរង់ចាំ", approved: "បានអនុញ្ញាត", rejected: "មិនអនុញ្ញាត", cancelled: "បានបោះបង់" } : { pending: "Waiting", approved: "Approved", rejected: "Not approved", cancelled: "Cancelled" };
        const nDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
        const d = (x: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${x}T00:00:00Z`));
        return (
          <div className="grid gap-3 lg:grid-cols-2">
            {(leaves ?? []).length === 0 && <p className="card p-8 text-center text-ink/55 lg:col-span-2">{km ? "មិនទាន់មានសំណើសុំច្បាប់ទេ។" : "No leave requests yet."}</p>}
            {(leaves ?? []).map((r: any) => (
              <div key={r.id} className={cn("card p-4", r.status === "pending" && "ring-2 ring-amber-300")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-extrabold text-forest">{staffName(r.user_id)}</span>
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-[#1E3A8A]">{K[r.kind as keyof typeof K]}</span>
                  {leaveUse.get(r.user_id) && (() => {
                    const u = leaveUse.get(r.user_id)!;
                    return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", u.remaining === 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")} title={km ? "បានប្រើ / អនុញ្ញាត ឆ្នាំនេះ" : "Used / allowed this year"}>{u.used}/{u.quota} · {km ? `នៅសល់ ${u.remaining}` : `${u.remaining} left`}</span>;
                  })()}
                  <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold", r.status === "pending" ? "bg-amber-50 text-amber-700" : r.status === "approved" ? "bg-emerald-50 text-emerald-700" : r.status === "rejected" ? "bg-red-50 text-red-700" : "bg-black/5 text-ink/50")}>{S[r.status as keyof typeof S]}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-ink/70">{d(r.start_date)}{r.end_date !== r.start_date && ` → ${d(r.end_date)}`} · {nDays(r.start_date, r.end_date)} {L.days}</p>
                <p className="mt-1 text-sm text-ink/60">{r.reason}</p>
                {r.admin_note && r.status !== "pending" && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-ink/60">{r.admin_note}</p>}
                {r.status === "pending" && (
                  <form action={decideLeave.bind(null, r.id)} className="mt-3 space-y-2">
                    <input name="admin_note" placeholder={km ? "កំណត់ចំណាំ (ស្រេចចិត្ត)" : "Note to staff (optional)"} className={input} />
                    <div className="grid grid-cols-2 gap-2">
                      <button name="decision" value="approved" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><CheckCircle2 size={16} /> {km ? "អនុញ្ញាត" : "Approve"}</button>
                      <button name="decision" value="rejected" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50"><XCircle size={16} /> {km ? "មិនអនុញ្ញាត" : "Reject"}</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {tab === "notices" && (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
          <form action={postNotice} className="card space-y-3 p-5">
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Megaphone size={20} className="text-primary" /> {km ? "សេចក្តីជូនដំណឹងថ្មី" : "New notice"}</p>
            <input name="title" required maxLength={120} placeholder={km ? "ចំណងជើង" : "Title"} className={input} />
            <textarea name="body" required maxLength={2000} rows={5} placeholder={km ? "ខ្លឹមសារ… (បុគ្គលិកទាំងអស់ឃើញនៅទំព័រដើម)" : "Message… (every staff member sees it on their home page)"} className={cn(input, "resize-none")} />
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink/70">
              <input type="checkbox" name="pinned" className="h-4 w-4 accent-[#176B3A]" /> <Pin size={14} className="text-amber-500" /> {km ? "ខ្ទាស់នៅខាងលើ" : "Pin to the top"}
            </label>
            <SubmitButton label={km ? "ផ្សាយ" : "Post"} pendingLabel="…" className="w-full py-2.5 text-sm" />
          </form>
          <div className="space-y-2">
            {(notices ?? []).length === 0 && <p className="card p-8 text-center text-ink/55">{km ? "មិនទាន់មានទេ។" : "Nothing posted yet."}</p>}
            {(notices ?? []).map((n: any) => (
              <div key={n.id} className={cn("card p-4", n.pinned && "ring-2 ring-amber-300")}>
                <div className="flex items-start gap-2">
                  <p className="flex-1 font-display font-extrabold text-forest">{n.pinned && <Pin size={14} className="-mt-0.5 mr-1 inline text-amber-500" />}{n.title}</p>
                  <form action={togglePin.bind(null, n.id, !n.pinned)}>
                    <button className="rounded-full p-1.5 text-ink/40 hover:text-amber-600" title={n.pinned ? "unpin" : "pin"}>{n.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                  </form>
                  <form action={deleteNotice.bind(null, n.id)}>
                    <button className="rounded-full p-1.5 text-ink/40 hover:text-red-600" title="delete"><Trash2 size={15} /></button>
                  </form>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{n.body}</p>
                <p className="mt-2 text-[11px] text-ink/40">{new Date(n.created_at).toLocaleString("en-GB", { timeZone: "Asia/Phnom_Penh", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "positions" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...positions, null].map((p) => (
            <details key={p?.id ?? "new"} className={cn("group card overflow-hidden", !p && "border-2 border-dashed border-primary/25 bg-light-green/30")}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: p?.color ?? "#94A3B8" }}>
                  {p ? <Briefcase size={20} /> : <Plus size={20} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-extrabold text-forest">{p ? pn(p) : L.newPos}</span>
                  {p && (
                    <span className="block text-xs text-ink/55">
                      {usd(p.rate)} · {km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en}
                    </span>
                  )}
                  {p && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {p.permissions.length === 0 ? (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-ink/45">—</span>
                      ) : (
                        p.permissions.map((k) => {
                          const x = PERMISSIONS.find((y) => y.key === k);
                          return (
                            <span key={k} className="rounded-full bg-light-green px-2 py-0.5 text-[10px] font-bold text-primary">
                              {x ? (km ? x.km : x.en).split(" (")[0] : k}
                            </span>
                          );
                        })
                      )}
                    </span>
                  )}
                </span>
                <span className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-black/10 group-open:bg-primary group-open:text-white">{p ? L.edit : L.add}</span>
              </summary>
              <form action={savePosition.bind(null, p?.id ?? null)} className="space-y-3 border-t border-black/5 bg-cream/50 p-4">
                <div className="flex items-center gap-2">
                  <input type="color" name="color" defaultValue={p?.color ?? "#2563EB"} className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0" aria-label="colour" />
                  <input name="name" defaultValue={p?.name ?? ""} placeholder="Name" required className={cn(input, "font-bold")} />
                </div>
                <input name="name_km" defaultValue={p?.name_km ?? ""} placeholder="ឈ្មោះជាខ្មែរ" className={input} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-ink/50">
                    {L.payType}
                    <select name="pay_type" defaultValue={p?.pay_type ?? "monthly"} className={cn(input, "mt-1")}>
                      {(Object.keys(PAY_TYPE) as (keyof typeof PAY_TYPE)[]).map((k) => (
                        <option key={k} value={k}>{km ? PAY_TYPE[k].km : PAY_TYPE[k].en}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-ink/50">
                    {L.rate} ($)
                    <input name="rate" type="number" step="0.5" min="0" defaultValue={p?.rate ?? 0} className={cn(input, "mt-1")} />
                  </label>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold text-ink/50">{L.perms}</legend>
                  <div className="space-y-1.5">
                    {PERMISSIONS.map((x) => (
                      <label key={x.key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold ring-1 ring-black/5">
                        <input type="checkbox" name="permissions" value={x.key} defaultChecked={p?.permissions.includes(x.key)} className="h-4 w-4 accent-[#176B3A]" />
                        {km ? x.km : x.en}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton label={p ? L.save : L.add} pendingLabel={L.saving} className="w-full py-2.5 text-sm" />
              </form>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
