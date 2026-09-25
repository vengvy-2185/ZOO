import Link from "next/link";
import { Ticket, Map as MapIcon, Sparkles, ScanLine, UserRoundPlus, PawPrint, BarChart3, LogIn, LogOut, Clock, Wallet, ShieldAlert, BadgeCheck, CheckCircle2, CalendarOff, Megaphone, Pin, ChevronRight, Users } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, payroll, thisMonth, openShift } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { ClockButton } from "@/components/staff/StaffForms";
import { StaffShell } from "@/components/staff/StaffShell";
import { clockIn, clockOut } from "./actions";

export const dynamic = "force-dynamic";
const usd = (n: number) => `$${n.toFixed(2)}`;

/** Staff home: clock in/out, this month's pay, notices, the tools their position allows, who's working. */
export default async function StaffHome({ searchParams }: { searchParams: { denied?: string } }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const month = thisMonth();
  const today = zooToday();
  const db = createServiceRoleClient();
  const p = access.staff?.position ?? null;
  const showTeam = access.admin || access.perms.has("reports");

  const [[pay], shift, { data: notices }, { count: pendingLeave }, reports, team] = await Promise.all([
    access.staff ? payroll(month, userId) : Promise.resolve([]),
    access.staff ? openShift(userId) : Promise.resolve(null),
    db.from("staff_announcements").select("id, title, body, pinned, created_at").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
    access.staff ? db.from("staff_leave_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending") : Promise.resolve({ count: 0 }),
    access.perms.has("reports")
      ? Promise.all([
          db.from("bookings").select("id", { count: "exact", head: true }).eq("visit_date", today).eq("status", "confirmed"),
          db.from("visitor_checkins").select("visitors_count").gte("checked_in_at", `${today}T00:00:00+07:00`),
          db.from("gate_entries").select("count").gte("created_at", `${today}T00:00:00+07:00`),
        ])
      : Promise.resolve(null),
    showTeam ? db.from("staff_attendance").select("user_id, clock_in").is("clock_out", null) : Promise.resolve({ data: [] as any[] }),
  ]);
  const onShiftIds = (team.data ?? []).map((t: any) => t.user_id);
  const { data: teamRows } = onShiftIds.length ? await db.from("staff_members").select("user_id, full_name, position:staff_positions(name, name_km, color)").in("user_id", onShiftIds) : { data: [] as any[] };
  const inside = reports ? (reports[1].data ?? []).reduce((s: number, r: any) => s + (r.visitors_count ?? 0), 0) + (reports[2].data ?? []).reduce((s: number, r: any) => s + (r.count ?? 0), 0) : 0;

  const L = km
    ? { hi: "សួស្តី", admin: "អ្នកកំពុងមើលជាអ្នកគ្រប់គ្រង។", onShift: "កំពុងធ្វើការ ចាប់ពី", off: "មិនទាន់ចុះម៉ោងចូល", in: "ចុះម៉ោងចូល", out: "ចុះម៉ោងចេញ", month: "ប្រាក់ខែខែនេះ", days: "ថ្ងៃ", hours: "ម៉ោង", est: "ប៉ាន់ស្មាន", paid: "បានបើករួច", details: "មើលលម្អិត", tools: "ឧបករណ៍ការងារ", scanner: "ស្កេនសំបុត្រ", scannerT: "ស្កេន QR ចូល និងទទួលប្រាក់ KHQR", gate: "បញ្ជររាប់ភ្ញៀវ", gateT: "រាប់ភ្ញៀវដែលទិញនៅច្រកចូល", animals: "កំណត់ត្រាថែសត្វ", animalsT: "ការឲ្យចំណី សុខភាព និងការសម្អាត", booked: "សំបុត្រកក់ថ្ងៃនេះ", insideNow: "ភ្ញៀវចូលថ្ងៃនេះ", noTools: "តួនាទីរបស់អ្នកមិនមានឧបករណ៍បន្ថែមទេ។", denied: "តួនាទីរបស់អ្នកមិនអាចប្រើឧបករណ៍នោះបានទេ។", notices: "សេចក្តីជូនដំណឹង", noNotices: "មិនទាន់មានសេចក្តីជូនដំណឹងទេ។", leave: "សុំច្បាប់", leaveT: (n: number) => (n ? `${n} សំណើកំពុងរង់ចាំ` : "ស្នើសុំឈប់សម្រាក"), hoursT: "ម៉ោងធ្វើការរបស់ខ្ញុំ", team: "អ្នកកំពុងធ្វើការឥឡូវ", nobody: "មិនទាន់មាននរណាចុះម៉ោងចូលទេ។", sub: "ថ្ងៃនេះ" }
    : { hi: "Hello", admin: "You are viewing as an admin.", onShift: "On shift since", off: "Not clocked in", in: "Clock in", out: "Clock out", month: "Pay this month", days: "days", hours: "hours", est: "estimate", paid: "Paid", details: "Details", tools: "Work tools", scanner: "Ticket scanner", scannerT: "Scan entry QR codes, take KHQR payments", gate: "Gate counter", gateT: "Count walk-in visitors", animals: "Animal care log", animalsT: "Feeding, health and cleaning notes", booked: "Tickets booked today", insideNow: "Visitors in today", noTools: "Your position has no extra tools.", denied: "Your position can't use that tool.", notices: "Notices", noNotices: "No notices yet.", leave: "Leave", leaveT: (n: number) => (n ? `${n} request(s) waiting` : "Ask for time off"), hoursT: "My working hours", team: "Working right now", nobody: "Nobody is clocked in yet.", sub: "Today" };

  const X = km
    ? { bookings: "ការកក់ថ្ងៃនេះ", bookingsT: "ស្វែងរកសំបុត្រ មើលអ្នកបានបង់ និងបានចូល", board: "ផ្ទាំងចំណី", boardT: "សត្វណាមិនទាន់បានចំណីថ្ងៃនេះ", schedule: "កម្មវិធីថ្ងៃនេះ", scheduleT: "កម្មវិធីសម្តែង និងការផ្តល់ចំណី តាមម៉ោង", cleaning: "បញ្ជីសម្អាត", cleaningT: "ធីកតំបន់ និងសេវាកម្មដែលសម្អាតរួច", reports: "របាយការណ៍", reportsT: "តួលេខថ្ងៃនេះ និង ៧ ថ្ងៃចុងក្រោយ" }
    : { bookings: "Today's bookings", bookingsT: "Find tickets, see who paid and who's in", board: "Feeding board", boardT: "Which animals still need feeding today", schedule: "Today's programme", scheduleT: "Shows and feedings by the clock", cleaning: "Cleaning checklist", cleaningT: "Tick zones and facilities as they're cleaned", reports: "Reports", reportsT: "Today's numbers and the last 7 days" };
  // one look for every tool: blue icon tiles
  const tools = [
    access.perms.has("tickets") && { href: "/staff/scanner", icon: ScanLine, title: L.scanner, text: L.scannerT },
    access.perms.has("tickets") && { href: "/staff/gate", icon: UserRoundPlus, title: L.gate, text: L.gateT },
    access.perms.has("tickets") && { href: "/staff/bookings", icon: Ticket, title: X.bookings, text: X.bookingsT },
    access.perms.has("animals") && { href: "/staff/animals", icon: PawPrint, title: L.animals, text: L.animalsT },
    access.perms.has("animals") && { href: "/staff/animals?tab=board", icon: CheckCircle2, title: X.board, text: X.boardT },
    access.perms.has("guide") && { href: "/staff/schedule", icon: MapIcon, title: X.schedule, text: X.scheduleT },
    access.perms.has("cleaning") && { href: "/staff/cleaning", icon: Sparkles, title: X.cleaning, text: X.cleaningT },
    access.perms.has("reports") && { href: "/staff/reports", icon: BarChart3, title: X.reports, text: X.reportsT },
  ].filter(Boolean) as { href: string; icon: any; title: string; text: string }[];
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const date = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const todayLong = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date());

  return (
    <StaffShell
      active="home"
      title={`${L.hi}, ${access.staff?.full_name ?? "Admin"}`}
      subtitle={todayLong}
      hero={
        access.staff && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-mono font-bold ring-1 ring-white/20"><BadgeCheck size={14} /> {access.staff.staff_no}</span>
            {p && <span className="rounded-full bg-white px-3 py-1 font-bold text-[#1E3A8A] shadow-soft">{(km && p.name_km) || p.name}</span>}
          </p>
        )
      }
    >
      {searchParams.denied && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200"><ShieldAlert size={18} /> {L.denied}</p>
      )}
      {!access.staff && <p className="card p-4 text-sm text-ink/65">{L.admin}</p>}

      {access.staff && pay && (
        <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
          {/* clock in / out */}
          <div className={`card relative overflow-hidden p-5 md:p-6 ${shift ? "ring-2 ring-emerald-400" : ""}`}>
            <p className="flex items-center gap-2 text-sm font-bold text-ink/55"><Clock size={16} className="text-[#1D4ED8]" /> {L.sub}</p>
            {shift ? (
              <p className="mt-2 flex items-center gap-2.5 font-display text-2xl font-extrabold text-emerald-700 md:text-3xl">
                <span className="relative flex h-3 w-3"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" /><span className="relative h-3 w-3 rounded-full bg-emerald-500" /></span>
                {L.onShift} {time(shift.clock_in)}
              </p>
            ) : (
              <p className="mt-2 font-display text-2xl font-extrabold text-ink/60 md:text-3xl">{L.off}</p>
            )}
            <form action={shift ? clockOut : clockIn} className="mt-5">
              <ClockButton onShift={Boolean(shift)} label={shift ? L.out : L.in} />
            </form>
            <Link href="/staff/attendance" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1D4ED8] hover:underline">{L.hoursT} <ChevronRight size={14} /></Link>
            {shift ? <LogOut size={110} className="pointer-events-none absolute -right-5 -top-5 text-emerald-500/10" /> : <LogIn size={110} className="pointer-events-none absolute -right-5 -top-5 text-[#1D4ED8]/10" />}
          </div>

          {/* this month's pay */}
          <Link href="/staff/pay" className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-lift md:p-6">
            <p className="flex items-center justify-between text-sm font-bold text-ink/55">
              <span className="flex items-center gap-2"><Wallet size={16} className="text-[#1D4ED8]" /> {L.month}</span>
              <span className="inline-flex items-center gap-0.5 text-xs text-[#1D4ED8]">{L.details} <ChevronRight size={14} className="transition group-hover:translate-x-0.5" /></span>
            </p>
            <p className="mt-1 font-display text-4xl font-extrabold text-forest">{usd(pay.payslip?.gross ?? pay.gross)}</p>
            <p className="text-xs font-bold text-ink/50">{pay.payslip ? <span className="text-emerald-700"><CheckCircle2 size={12} className="-mt-0.5 inline" /> {L.paid}</span> : L.est}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-[#EEF2FF] p-2.5"><p className="font-display text-xl font-extrabold text-[#1E3A8A]">{pay.days}</p>{L.days}</div>
              <div className="rounded-2xl bg-[#EEF2FF] p-2.5"><p className="font-display text-xl font-extrabold text-[#1E3A8A]">{pay.hours}</p>{L.hours}</div>
            </div>
          </Link>
        </div>
      )}

      {/* tools + quick links */}
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.tools}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="group card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white shadow-soft"><t.icon size={26} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-extrabold text-forest">{t.title}</span>
                <span className="block text-xs text-ink/55">{t.text}</span>
              </span>
              <ChevronRight size={18} className="text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/60" />
            </Link>
          ))}
          {access.staff && (
            <Link href="/staff/leave" className="group card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8]"><CalendarOff size={26} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-extrabold text-forest">{L.leave}</span>
                <span className={`block text-xs ${pendingLeave ? "font-bold text-[#1D4ED8]" : "text-ink/55"}`}>{L.leaveT(pendingLeave ?? 0)}</span>
              </span>
              <ChevronRight size={18} className="text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/60" />
            </Link>
          )}
          {reports && (
            <div className="card flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8]"><Users size={26} /></span>
              <div className="grid flex-1 grid-cols-2 gap-2 text-center">
                <div><p className="font-display text-2xl font-extrabold text-forest">{reports[0].count ?? 0}</p><p className="text-[11px] text-ink/55">{L.booked}</p></div>
                <div><p className="font-display text-2xl font-extrabold text-forest">{inside}</p><p className="text-[11px] text-ink/55">{L.insideNow}</p></div>
              </div>
            </div>
          )}
          {tools.length === 0 && !reports && !access.staff && <p className="card p-5 text-sm text-ink/60">{L.noTools}</p>}
        </div>
      </section>

      <div className={`grid gap-4 ${showTeam ? "lg:grid-cols-2" : ""}`}>
        {/* notices */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Megaphone size={20} className="text-[#1D4ED8]" /> {L.notices}</h2>
          <div className="space-y-2">
            {(notices ?? []).length === 0 ? (
              <p className="card p-5 text-sm text-ink/55">{L.noNotices}</p>
            ) : (
              (notices ?? []).map((n: any) => (
                <div key={n.id} className={`card p-4 ${n.pinned ? "ring-2 ring-[#93C5FD]" : ""}`}>
                  <p className="flex items-center gap-2 font-display font-extrabold text-forest">
                    {n.pinned && <Pin size={14} className="text-[#1D4ED8]" />} {n.title}
                    <span className="ml-auto text-[11px] font-semibold text-ink/40">{date(n.created_at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* team on shift */}
        {showTeam && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Users size={20} className="text-[#1D4ED8]" /> {L.team} <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-sm text-[#1D4ED8]">{onShiftIds.length}</span></h2>
            <div className="card divide-y divide-black/5">
              {(teamRows ?? []).length === 0 ? (
                <p className="p-5 text-sm text-ink/55">{L.nobody}</p>
              ) : (
                (teamRows ?? []).map((m: any) => {
                  const since = (team.data ?? []).find((t: any) => t.user_id === m.user_id)?.clock_in;
                  return (
                    <div key={m.user_id} className="flex items-center gap-3 p-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-extrabold text-white" style={{ background: m.position?.color ?? "#64748B" }}>{[...m.full_name][0]?.toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-forest">{m.full_name}</span>
                        <span className="block text-xs text-ink/50">{(km && m.position?.name_km) || m.position?.name}</span>
                      </span>
                      {since && <span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {time(since)}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </StaffShell>
  );
}
