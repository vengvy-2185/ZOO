import Link from "next/link";
import { BadgeCheck, Briefcase, Wallet, Users, Printer, Clock, Trash2, CheckCircle2, Undo2, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
import { getI18n } from "@/lib/i18n/server";
import { getPositions, payroll, thisMonth, PERMISSIONS, PAY_TYPE, type PayLine, type Position } from "@/lib/server/staff";
import { cn } from "@/lib/utils/cn";
import { AddStaffForm, ResetPassword } from "./StaffClient";
import { updateStaff, savePosition, addAdjustment, removeAdjustment, markPaid, unmarkPaid } from "./actions";

export const dynamic = "force-dynamic";

const TABS = ["people", "payroll", "positions"] as const;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export default async function AdminStaffPage({ searchParams }: { searchParams: { tab?: string; month?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? searchParams.tab! : "people";
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const [positions, lines] = await Promise.all([getPositions(), payroll(month)]);
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
    ? { title: "បុគ្គលិក និងប្រាក់ខែ", sub: "មានតែអ្នកគ្រប់គ្រងទេដែលបង្កើតគណនីបុគ្គលិក។ បុគ្គលិកម្នាក់ៗទទួលបានលេខសម្គាល់ (GWZ-S-…) សម្រាប់ចូលប្រើ និងកាតសម្គាល់ភ្លាមៗ។", tabs: { people: "បុគ្គលិក", payroll: "ប្រាក់ខែ", positions: "តួនាទី និងអត្រា" }, staff: "បុគ្គលិកសកម្ម", shift: "កំពុងធ្វើការឥឡូវ", total: "ប្រាក់ខែសរុបខែនេះ", paid: "បានបើករួច", pos: "តួនាទី", status: "ស្ថានភាព", st: { active: "សកម្ម", suspended: "ផ្អាក", left: "លាឈប់" }, month: "ខែនេះ", card: "កាត", edit: "កែប្រែ", save: "រក្សាទុក", saving: "កំពុងរក្សាទុក…", none: "មិនទាន់មានបុគ្គលិកទេ។ បន្ថែមម្នាក់ខាងលើ។", days: "ថ្ងៃ", hours: "ម៉ោង", base: "ប្រាក់គោល", allowance: "ឧបត្ថម្ភ", adj: "បន្ថែម/កាត់", gross: "សរុប", markPaid: "បានបើកប្រាក់", undo: "មិនទាន់", paidOn: "បានបើក", bonus: "ប្រាក់រង្វាន់ / កាត់", note: "មូលហេតុ", add: "បន្ថែម", rate: "អត្រា", payType: "របៀបគិតប្រាក់", perms: "អាចប្រើ", newPos: "តួនាទីថ្មី", del: "លុប", phone: "ទូរស័ព្ទ", allowanceM: "ឧបត្ថម្ភ/ខែ", onShiftNow: "កំពុងធ្វើការ" }
    : { title: "Staff and payroll", sub: "Only admins create staff accounts. Each person gets a Staff ID (GWZ-S-…) to sign in with and an ID card straight away.", tabs: { people: "Staff", payroll: "Payroll", positions: "Positions and pay" }, staff: "Active staff", shift: "Working right now", total: "Payroll this month", paid: "Already paid", pos: "Position", status: "Status", st: { active: "Active", suspended: "Suspended", left: "Left" }, month: "This month", card: "Card", edit: "Edit", save: "Save", saving: "Saving…", none: "No staff yet. Add someone above.", days: "days", hours: "hours", base: "Base", allowance: "Allowance", adj: "Bonus/deduction", gross: "Total", markPaid: "Mark paid", undo: "Undo", paidOn: "Paid", bonus: "Bonus / deduction", note: "Reason", add: "Add", rate: "Rate", payType: "Pay type", perms: "Can use", newPos: "New position", del: "Delete", phone: "Phone", allowanceM: "Allowance/month", onShiftNow: "On shift" };

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

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((k) => (
          <Link key={k} href={`/admin/staff?tab=${k}&month=${month}`} className={cn("rounded-full px-4 py-2 text-sm font-bold", tab === k ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10 hover:bg-light-green")}>
            {k === "people" ? <Users size={15} className="-mt-0.5 mr-1.5 inline" /> : k === "payroll" ? <Wallet size={15} className="-mt-0.5 mr-1.5 inline" /> : <Briefcase size={15} className="-mt-0.5 mr-1.5 inline" />}
            {L.tabs[k]}
          </Link>
        ))}
      </div>

      {tab === "people" && (
        <div className="space-y-5">
          <AddStaffForm positions={positions} km={km} today={today} />
          {lines.length === 0 ? (
            <p className="card p-8 text-center text-ink/55">{L.none}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
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
                        <input name="allowance" type="number" step="0.5" min="0" defaultValue={s.allowance} className={input} title={L.allowanceM} />
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

      {tab === "payroll" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/staff?tab=payroll&month=${shift(-1)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">←</Link>
            <span className="rounded-full bg-forest px-5 py-2 font-display font-extrabold text-white">{monthLabel}</span>
            <Link href={`/admin/staff?tab=payroll&month=${shift(1)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">→</Link>
          </div>
          {lines.length === 0 && <p className="card p-8 text-center text-ink/55">{L.none}</p>}
          {lines.map((l) => {
            const p = l.staff.position;
            return (
              <div key={l.staff.user_id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <span className="h-10 w-1.5 rounded-full" style={{ background: p?.color ?? "#64748B" }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold text-forest">{l.staff.full_name} <span className="font-mono text-xs text-ink/45">{l.staff.staff_no}</span></p>
                    <p className="text-xs text-ink/55">
                      {pn(p)} · {p ? `${km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en} ${usd(p.rate)}` : "—"} · {units(l)}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-right text-xs">
                    <div><p className="text-ink/45">{L.base}</p><p className="font-bold">{usd(l.base)}</p></div>
                    <div><p className="text-ink/45">{L.allowance}</p><p className="font-bold">{usd(l.allowance)}</p></div>
                    <div><p className="text-ink/45">{L.adj}</p><p className={cn("font-bold", l.adjTotal < 0 ? "text-red-600" : l.adjTotal > 0 ? "text-emerald-600" : "")}>{usd(l.adjTotal)}</p></div>
                    <div><p className="text-ink/45">{L.gross}</p><p className="font-display text-base font-extrabold text-forest">{usd(l.payslip?.gross ?? l.gross)}</p></div>
                  </div>
                  {l.payslip ? (
                    <form action={unmarkPaid.bind(null, l.staff.user_id, month)} className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1.5 text-xs font-extrabold text-primary">
                        <CheckCircle2 size={14} /> {L.paidOn} {new Date(l.payslip.paid_at).toLocaleDateString("en-GB", { timeZone: "Asia/Phnom_Penh" })}
                      </span>
                      <button className="rounded-full p-1.5 text-ink/40 hover:text-red-600" title={L.undo}><Undo2 size={15} /></button>
                    </form>
                  ) : (
                    <form action={markPaid.bind(null, l.staff.user_id, month)}>
                      <SubmitButton label={L.markPaid} pendingLabel="…" className="px-4 py-2 text-xs" />
                    </form>
                  )}
                </div>
                <div className="border-t border-black/5 bg-cream/60 px-4 py-3">
                  {l.adjustments.length > 0 && (
                    <ul className="mb-2 space-y-1 text-sm">
                      {l.adjustments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <span className={cn("font-mono font-bold", a.amount < 0 ? "text-red-600" : "text-emerald-600")}>{a.amount > 0 ? "+" : ""}{usd(a.amount)}</span>
                          <span className="flex-1 text-ink/65">{a.note}</span>
                          {!l.payslip && (
                            <form action={removeAdjustment.bind(null, a.id)}>
                              <button className="text-ink/35 hover:text-red-600"><Trash2 size={14} /></button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!l.payslip && (
                    <form action={addAdjustment.bind(null, l.staff.user_id, month)} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-ink/50">{L.bonus}</span>
                      <select name="sign" className="rounded-xl border border-black/10 bg-white px-2 py-1.5 text-sm">
                        <option value="+">+</option>
                        <option value="-">−</option>
                      </select>
                      <input name="amount" type="number" step="0.5" min="0" placeholder="$" className="w-24 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm" required />
                      <input name="note" placeholder={L.note} className="min-w-[10rem] flex-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm" required />
                      <button className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"><Plus size={13} /> {L.add}</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "positions" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {[...positions, null].map((p) => (
            <form key={p?.id ?? "new"} action={savePosition.bind(null, p?.id ?? null)} className={cn("card space-y-3 p-4", !p && "border-2 border-dashed border-primary/25 bg-light-green/30")}>
              <div className="flex items-center gap-2">
                <input type="color" name="color" defaultValue={p?.color ?? "#2563EB"} className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                <input name="name" defaultValue={p?.name ?? ""} placeholder={L.newPos} required className={cn(input, "font-bold")} />
                <input name="name_km" defaultValue={p?.name_km ?? ""} placeholder="ឈ្មោះជាខ្មែរ" className={input} />
              </div>
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
                <legend className="mb-1 text-xs font-bold text-ink/50">{L.perms}</legend>
                <div className="flex flex-wrap gap-2">
                  {PERMISSIONS.map((x) => (
                    <label key={x.key} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-black/10">
                      <input type="checkbox" name="permissions" value={x.key} defaultChecked={p?.permissions.includes(x.key)} className="accent-[#176B3A]" />
                      {km ? x.km : x.en}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center justify-end gap-2">
                <SubmitButton label={p ? L.save : L.add} pendingLabel={L.saving} className="px-4 py-2 text-xs" />
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
