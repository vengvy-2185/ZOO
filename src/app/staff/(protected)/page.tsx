import Link from "next/link";
import { ScanLine, UserRoundPlus, PawPrint, BarChart3, LogIn, LogOut, Clock, Wallet, CalendarDays, ShieldAlert, LogOut as SignOutIcon, BadgeCheck, CheckCircle2 } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, payroll, thisMonth, openShift, PAY_TYPE } from "@/lib/server/staff";
import { getMembers, ensureCard } from "@/lib/server/members";
import { getSiteUrl } from "@/lib/server/site-url";
import { cardNo } from "@/lib/members";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { IdCard } from "@/components/IdCard";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { LogoMark } from "@/components/visitor/Logo";
import { SubmitButton } from "@/components/admin/ui-client";
import { clockIn, clockOut } from "./actions";

export const dynamic = "force-dynamic";
const usd = (n: number) => `$${n.toFixed(2)}`;

/** The staff home: ID card, clock in/out, this month's pay, and the tools their position allows. */
export default async function StaffHome({ searchParams }: { searchParams: { denied?: string } }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const month = thisMonth();
  const [pay] = access.staff ? await payroll(month, userId) : [];
  const shift = access.staff ? await openShift(userId) : null;
  const [found] = await getMembers(userId);
  const member = found?.card ? await ensureCard(found) : found;
  const site = getSiteUrl();
  const p = access.staff?.position ?? null;

  const db = createServiceRoleClient();
  const today = zooToday();
  const [{ data: slips }, reports] = await Promise.all([
    access.staff ? db.from("staff_payslips").select("month, gross, paid_at").eq("user_id", userId).order("month", { ascending: false }).limit(6) : Promise.resolve({ data: [] as any[] }),
    access.perms.has("reports")
      ? Promise.all([
          db.from("bookings").select("id", { count: "exact", head: true }).eq("visit_date", today).eq("status", "confirmed"),
          db.from("visitor_checkins").select("visitors_count").gte("checked_in_at", `${today}T00:00:00+07:00`),
          db.from("gate_entries").select("count").gte("created_at", `${today}T00:00:00+07:00`),
        ])
      : Promise.resolve(null),
  ]);
  const inside = reports ? (reports[1].data ?? []).reduce((s: number, r: any) => s + (r.visitors_count ?? 0), 0) + (reports[2].data ?? []).reduce((s: number, r: any) => s + (r.count ?? 0), 0) : 0;

  const L = km
    ? { hi: "សួស្តី", admin: "អ្នកកំពុងមើលជាអ្នកគ្រប់គ្រង (មិនមានកាត ឬម៉ោងធ្វើការ)។", onShift: "កំពុងធ្វើការ ចាប់ពី", off: "មិនទាន់ចុះម៉ោងចូល", in: "ចុះម៉ោងចូល", out: "ចុះម៉ោងចេញ", month: "ខែនេះ", days: "ថ្ងៃ", hours: "ម៉ោង", est: "ប្រាក់ខែប៉ាន់ស្មាន", paid: "បានបើករួច", tools: "ឧបករណ៍របស់អ្នក", scanner: "ស្កេនសំបុត្រ", scannerT: "ស្កេន QR ចូល និងទទួលប្រាក់ KHQR", gate: "បញ្ជររាប់ភ្ញៀវ", gateT: "រាប់ភ្ញៀវដែលទិញនៅច្រកចូល", animals: "កំណត់ត្រាថែសត្វ", animalsT: "ការឲ្យចំណី សុខភាព និងការសម្អាត", reports: "តួលេខថ្ងៃនេះ", booked: "សំបុត្រកក់ថ្ងៃនេះ", insideNow: "ភ្ញៀវចូលថ្ងៃនេះ", noTools: "តួនាទីរបស់អ្នកមិនទាន់មានឧបករណ៍ទេ។ ចុះម៉ោងចូល/ចេញនៅទីនេះ។", denied: "តួនាទីរបស់អ្នកមិនអាចប្រើឧបករណ៍នោះបានទេ។", slips: "ប្រាក់ខែដែលបានបើក", card: "កាតសម្គាល់ខ្លួន", signOut: "ចាកចេញ", rate: "អត្រា", allowance: "ឧបត្ថម្ភ", adj: "បន្ថែម/កាត់" }
    : { hi: "Hello", admin: "You are viewing as an admin (no card or working hours).", onShift: "On shift since", off: "Not clocked in", in: "Clock in", out: "Clock out", month: "This month", days: "days", hours: "hours", est: "Estimated pay", paid: "Paid", tools: "Your tools", scanner: "Ticket scanner", scannerT: "Scan entry QR codes, take KHQR payments", gate: "Gate counter", gateT: "Count walk-in visitors", animals: "Animal care log", animalsT: "Feeding, health and cleaning notes", reports: "Today's numbers", booked: "Tickets booked today", insideNow: "Visitors in today", noTools: "Your position has no tools yet. Clock in and out here.", denied: "Your position can't use that tool.", slips: "Payslips", card: "My ID card", signOut: "Sign out", rate: "Rate", allowance: "Allowance", adj: "Bonus/deduction" };

  const tools = [
    access.perms.has("tickets") && { href: "/staff/scanner", icon: ScanLine, title: L.scanner, text: L.scannerT, color: "#2563EB" },
    access.perms.has("tickets") && { href: "/staff/gate", icon: UserRoundPlus, title: L.gate, text: L.gateT, color: "#0EA5E9" },
    access.perms.has("animals") && { href: "/staff/animals", icon: PawPrint, title: L.animals, text: L.animalsT, color: "#15803D" },
  ].filter(Boolean) as { href: string; icon: any; title: string; text: string; color: string }[];
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-background pb-16">
      <header className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] px-4 pb-20 pt-5 text-white md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-full bg-white p-1"><LogoMark className="h-8 w-8" /></span>
            <span className="font-display font-extrabold tracking-wide">GREEN WILD ZOO · STAFF</span>
          </Link>
          <SignOutButton redirectTo="/staff/login" label={L.signOut} className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25">
            <SignOutIcon size={15} /> {L.signOut}
          </SignOutButton>
        </div>
        <div className="mx-auto mt-6 max-w-5xl">
          <p className="text-sm text-white/75">{L.hi},</p>
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{access.staff?.full_name ?? member?.name ?? "Admin"}</h1>
          {access.staff && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-mono font-bold"><BadgeCheck size={14} /> {access.staff.staff_no}</span>
              {p && <span className="rounded-full px-3 py-1 font-bold" style={{ background: p.color }}>{(km && p.name_km) || p.name}</span>}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-14 max-w-5xl space-y-5 px-4 md:px-8">
        {searchParams.denied && (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200"><ShieldAlert size={18} /> {L.denied}</p>
        )}
        {!access.staff && <p className="card p-4 text-sm text-ink/65">{L.admin}</p>}

        {access.staff && pay && (
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            {/* clock in / out */}
            <div className={`card relative overflow-hidden p-5 ${shift ? "ring-2 ring-emerald-400" : ""}`}>
              <p className="flex items-center gap-2 text-sm font-bold text-ink/55"><Clock size={16} className="text-primary" /> {new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date())}</p>
              {shift ? (
                <p className="mt-2 flex items-center gap-2 font-display text-2xl font-extrabold text-emerald-700">
                  <span className="relative flex h-3 w-3"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" /><span className="relative h-3 w-3 rounded-full bg-emerald-500" /></span>
                  {L.onShift} {time(shift.clock_in)}
                </p>
              ) : (
                <p className="mt-2 font-display text-2xl font-extrabold text-ink/60">{L.off}</p>
              )}
              <form action={shift ? clockOut : clockIn} className="mt-4">
                <SubmitButton label={shift ? L.out : L.in} pendingLabel="…" className={`w-full py-3.5 text-base ${shift ? "!bg-[#E1232E]" : ""}`} />
              </form>
              {shift ? <LogOut size={90} className="pointer-events-none absolute -right-4 -top-4 text-emerald-500/10" /> : <LogIn size={90} className="pointer-events-none absolute -right-4 -top-4 text-primary/10" />}
            </div>

            {/* this month's pay */}
            <div className="card p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-ink/55"><Wallet size={16} className="text-primary" /> {L.month}</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-forest">{usd(pay.payslip?.gross ?? pay.gross)}</p>
              <p className="text-xs font-bold text-ink/50">{pay.payslip ? <span className="text-primary"><CheckCircle2 size={12} className="-mt-0.5 inline" /> {L.paid}</span> : L.est}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-cream p-2"><p className="font-display text-lg font-extrabold text-forest">{pay.days}</p>{L.days}</div>
                <div className="rounded-2xl bg-cream p-2"><p className="font-display text-lg font-extrabold text-forest">{pay.hours}</p>{L.hours}</div>
                <div className="rounded-2xl bg-cream p-2"><p className="font-display text-lg font-extrabold text-forest">{p ? usd(p.rate) : "—"}</p>{p ? (km ? PAY_TYPE[p.pay_type].km : PAY_TYPE[p.pay_type].en) : L.rate}</div>
              </div>
              {(pay.allowance > 0 || pay.adjTotal !== 0) && (
                <p className="mt-2 text-xs text-ink/55">{L.allowance} {usd(pay.allowance)} · {L.adj} {usd(pay.adjTotal)}</p>
              )}
            </div>
          </div>
        )}

        {/* tools */}
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.tools}</h2>
          {tools.length === 0 && !reports ? (
            <p className="card p-5 text-sm text-ink/60">{L.noTools}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <Link key={t.href} href={t.href} className="group card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-soft" style={{ background: t.color }}><t.icon size={26} /></span>
                  <span>
                    <span className="block font-display text-lg font-extrabold text-forest">{t.title}</span>
                    <span className="block text-xs text-ink/55">{t.text}</span>
                  </span>
                </Link>
              ))}
              {reports && (
                <div className="card flex items-center gap-4 p-4">
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED] text-white shadow-soft"><BarChart3 size={26} /></span>
                  <div className="grid flex-1 grid-cols-2 gap-2 text-center">
                    <div><p className="font-display text-2xl font-extrabold text-forest">{reports[0].count ?? 0}</p><p className="text-[11px] text-ink/55">{L.booked}</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-forest">{inside}</p><p className="text-[11px] text-ink/55">{L.insideNow}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ID card + payslips */}
        {access.staff && member?.card && (
          <section className="grid items-start gap-5 md:grid-cols-[auto_1fr]">
            <div>
              <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.card}</h2>
              <IdCard
                data={{ type: member.card, name: member.name, photo: member.avatar, memberNo: cardNo(member), since: access.staff.hired_on.slice(0, 7).replace("-", "."), site, verifyUrl: member.verifyToken ? `${site}/verify/${member.verifyToken}` : null, roleEn: member.positionEn, roleKm: member.positionKm }}
                fileName={`staff-card-${access.staff.staff_no}`}
                labels={km ? { save: "រក្សាទុកក្នុងទូរស័ព្ទ", print: "បោះពុម្ព", flip: "ត្រឡប់", hint: "ចុចលើកាតដើម្បីមើលខាងក្រោយ" } : { save: "Save to phone", print: "Print", flip: "Flip", hint: "Tap the card to see the back" }}
                width={240}
              />
            </div>
            <div>
              <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.slips}</h2>
              <div className="card divide-y divide-black/5">
                {(slips ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-ink/55">—</p>
                ) : (
                  (slips ?? []).map((s: any) => (
                    <div key={s.month} className="flex items-center justify-between p-4">
                      <span className="flex items-center gap-2 text-sm font-bold text-forest"><CalendarDays size={15} className="text-primary" /> {new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${s.month}T00:00:00Z`))}</span>
                      <span className="font-display font-extrabold text-forest">{usd(Number(s.gross))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
