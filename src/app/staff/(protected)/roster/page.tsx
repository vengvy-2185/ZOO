import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Copy, LifeBuoy, ArrowLeftRight, CheckCircle2, XCircle, Clock, UserCheck } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getAttendanceSettings, localDay } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { SubmitButton } from "@/components/admin/ui-client";
import { ShiftRequestForm } from "@/components/staff/ShiftRequestForm";
import { TASK_SECTIONS } from "@/lib/staff-extras";
import { saveRosterWeek, copyLastWeek, acceptShiftRequest, cancelShiftRequest, decideShiftRequest } from "../actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Schedule", "កាលវិភាគ");

type Shift = "morning" | "afternoon" | "full" | "off";
const SHIFT: Record<Shift, { en: string; km: string; short: string; shortKm: string; cls: string }> = {
  morning: { en: "Morning", km: "ព្រឹក", short: "AM", shortKm: "ព្រឹក", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  afternoon: { en: "Afternoon", km: "រសៀល", short: "PM", shortKm: "រសៀល", cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  full: { en: "Full day", km: "ពេញថ្ងៃ", short: "Full", shortKm: "ពេញ", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  off: { en: "Day off", km: "ឈប់", short: "Off", shortKm: "ឈប់", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};
const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const monday = (d: string) => {
  const t = new Date(`${d}T12:00:00Z`);
  return addDays(d, -((t.getUTCDay() + 6) % 7));
};

/** The team's work schedule by week or month; cover and swap requests. */
export default async function RosterPage({ searchParams }: { searchParams: { w?: string; s?: string; v?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const today = localDay();
  const view = searchParams.v === "month" ? "month" : "week";
  const base = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.w ?? "") ? searchParams.w! : today;
  const weekStart = monday(base);
  const monthStart = `${base.slice(0, 7)}-01`;
  const monthDays = new Date(Date.UTC(Number(base.slice(0, 4)), Number(base.slice(5, 7)), 0)).getUTCDate();
  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : Array.from({ length: monthDays }, (_, i) => addDays(monthStart, i));

  const sections = (Object.keys(TASK_SECTIONS) as (keyof typeof TASK_SECTIONS)[]).filter((k) => manager || access.perms.has(k));
  const mySections = sections.filter((k) => access.perms.has(k) && k !== "reports");
  const section = (sections as string[]).includes(searchParams.s ?? "") ? (searchParams.s as keyof typeof TASK_SECTIONS) : manager ? null : mySections[0] ?? null;

  const db = createServiceRoleClient();
  const [{ data: staffRows }, s] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, staff_no, position:staff_positions(name, name_km, permissions)").eq("status", "active").order("full_name"),
    getAttendanceSettings(),
  ]);
  const team = (staffRows ?? []).filter((p: any) => !section || (p.position?.permissions ?? []).includes(section));
  if (!manager && access.staff && !team.some((p: any) => p.user_id === userId)) team.unshift(access.staff as any);
  const ids = team.map((p: any) => p.user_id);
  const [{ data: roster }, { data: requests }, { data: myUpcoming }] = await Promise.all([
    ids.length ? db.from("staff_roster").select("id, user_id, day, shift, note").in("user_id", ids).gte("day", days[0]).lte("day", days[days.length - 1]) : Promise.resolve({ data: [] as any[] }),
    db.from("staff_shift_requests").select("*, roster:roster_id(day, shift, user_id), swap:swap_roster_id(day, shift, user_id)").in("status", ["open", "accepted"]).order("created_at", { ascending: false }).limit(60),
    db.from("staff_roster").select("id, day, shift").eq("user_id", userId).gte("day", today).lte("day", addDays(today, 30)).neq("shift", "off").order("day"),
  ]);
  const cell = new Map((roster ?? []).map((r: any) => [`${r.user_id}_${r.day}`, r]));
  const nameOf = new Map((staffRows ?? []).map((p: any) => [p.user_id, p.full_name as string]));
  const shiftTimes: Record<Shift, string> = { morning: `${s.morning_start}–${s.morning_end}`, afternoon: `${s.afternoon_start}–${s.afternoon_end}`, full: `${s.morning_start}–${s.afternoon_end}`, off: "" };
  const dayName = (d: string, style: "short" | "long" = "short") => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: style, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const dayNum = (d: string) => Number(d.slice(8));
  const dateLabel = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${d}T12:00:00Z`));
  const periodLabel =
    view === "week"
      ? `${new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${days[0]}T12:00:00Z`))} – ${new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${days[6]}T12:00:00Z`))}`
      : new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));
  const prev = view === "week" ? addDays(weekStart, -7) : addDays(monthStart, -1).slice(0, 7) + "-01";
  const next = view === "week" ? addDays(weekStart, 7) : addDays(addDays(monthStart, monthDays), 0);
  const q = (o: Record<string, string>) => `/staff/roster?${new URLSearchParams({ v: view, w: base, ...(section ? { s: section } : {}), ...o })}`;

  // requests: what I can do about them
  const reqs = (requests ?? []) as any[];
  const colleaguesOfMe = new Set((staffRows ?? []).filter((p: any) => (p.position?.permissions ?? []).some((x: string) => mySections.includes(x as any))).map((p: any) => p.user_id));
  const forMe = reqs.filter((r) => r.status === "open" && r.from_user !== userId && ((r.kind === "cover" && colleaguesOfMe.has(r.from_user)) || (r.kind === "swap" && r.swap?.user_id === userId)));
  const mine = reqs.filter((r) => r.from_user === userId);
  const toApprove = manager ? reqs.filter((r) => r.status === "accepted") : [];
  const others = (roster ?? [])
    .filter((r: any) => r.user_id !== userId && r.shift !== "off" && r.day >= today)
    .map((r: any) => ({ id: r.id, label: `${nameOf.get(r.user_id) ?? "—"} · ${dateLabel(r.day)} · ${km ? SHIFT[r.shift as Shift].km : SHIFT[r.shift as Shift].en}` }));
  const myWeek = days.slice(0, 7);

  const L = km
    ? { title: "កាលវិភាគការងារ", sub: "វេនធ្វើការប្រចាំសប្តាហ៍ និងប្រចាំខែ របស់ក្រុមនីមួយៗ។ ប្តូរវេន ឬរកអ្នកជំនួស ពេលមានបញ្ហា។", week: "សប្តាហ៍", month: "ខែ", all: "ទាំងអស់", save: "រក្សាទុកកាលវិភាគ", saving: "កំពុងរក្សាទុក…", copy: "ចម្លងសប្តាហ៍មុន", mine: "វេនរបស់ខ្ញុំ", team: "កាលវិភាគក្រុម", ask: "ប្តូរវេន / រកអ្នកជំនួស", forMe: "អ្នកអាចជួយបាន", myReq: "សំណើរបស់ខ្ញុំ", approve: "រង់ចាំអ្នកគ្រប់គ្រងអនុម័ត", take: "ខ្ញុំជំនួស", agree: "យល់ព្រមដូរ", cancel: "បោះបង់", yes: "អនុម័ត", no: "បដិសេធ", st: { open: "រង់ចាំអ្នកជំនួស", accepted: "មានអ្នកទទួលហើយ · រង់ចាំអនុម័ត" }, cover: "ជំនួស", swap: "ដូរ", nothing: "គ្មានទេ", none: "—", legend: "ពន្យល់", today: "ថ្ងៃនេះ", noTeam: "មិនមានបុគ្គលិកក្នុងក្រុមនេះទេ។" }
    : { title: "Work schedule", sub: "Each team's shifts by week or month. Swap a shift or find cover when something comes up.", week: "Week", month: "Month", all: "Everyone", save: "Save schedule", saving: "Saving…", copy: "Copy last week", mine: "My shifts", team: "Team schedule", ask: "Swap / find cover", forMe: "You can help", myReq: "My requests", approve: "Waiting for approval", take: "I'll cover", agree: "Agree to swap", cancel: "Cancel", yes: "Approve", no: "Refuse", st: { open: "Looking for cover", accepted: "Taken · waiting for approval" }, cover: "Cover", swap: "Swap", nothing: "Nothing", none: "—", legend: "Key", today: "Today", noTeam: "No staff in this team." };
  const badge = (sh: Shift | undefined, compact = false) =>
    sh ? <span className={cn("inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-extrabold ring-1", SHIFT[sh].cls, compact && "w-full px-0.5 py-0.5 text-[10px]")}>{compact ? (km ? SHIFT[sh].shortKm : SHIFT[sh].short) : km ? SHIFT[sh].km : SHIFT[sh].en}</span> : <span className="text-ink/20">·</span>;

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      {/* controls */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-full bg-[#EEF2FF] p-1">
          {(["week", "month"] as const).map((v) => (
            <Link key={v} href={q({ v })} className={cn("rounded-full px-4 py-1.5 text-sm font-bold", view === v ? "bg-[#1D4ED8] text-white shadow-soft" : "text-[#1E3A8A]")}>{v === "week" ? L.week : L.month}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Link href={q({ w: prev })} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]" aria-label="previous"><ChevronLeft size={18} /></Link>
          <span className="min-w-[10rem] text-center font-display text-base font-extrabold text-forest">{periodLabel}</span>
          <Link href={q({ w: next })} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]" aria-label="next"><ChevronRight size={18} /></Link>
          <Link href={q({ w: today })} className="ml-1 rounded-full px-3 py-1.5 text-xs font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{L.today}</Link>
        </div>
        <div className="no-scrollbar flex w-full gap-1.5 overflow-x-auto md:ml-auto md:w-auto">
          {manager && <Link href={`/staff/roster?${new URLSearchParams({ v: view, w: base })}`} className={cn("flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", !section ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10")}>{L.all}</Link>}
          {sections.map((k) => {
            const S = TASK_SECTIONS[k];
            return (
              <Link key={k} href={q({ s: k })} className={cn("inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold", section === k ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10")}>
                <S.Icon size={13} /> {km ? S.km : S.en}
              </Link>
            );
          })}
        </div>
      </div>

      {/* my week */}
      {access.staff && view === "week" && (
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><UserCheck size={20} className="text-[#1D4ED8]" /> {L.mine}</h2>
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {myWeek.map((d) => {
              const r: any = cell.get(`${userId}_${d}`);
              const sh = r?.shift as Shift | undefined;
              return (
                <div key={d} className={cn("flex flex-col items-center gap-1 rounded-2xl p-1.5 text-center ring-1 md:p-2.5", d === today ? "bg-[#EEF2FF] ring-[#93C5FD]" : "bg-white ring-black/5")}>
                  <span className="text-[11px] font-bold text-ink/50 md:text-xs">{dayName(d)}</span>
                  <span className={cn("font-display text-lg font-extrabold leading-none md:text-2xl", d === today ? "text-[#1D4ED8]" : "text-forest")}>{dayNum(d)}</span>
                  {sh ? badge(sh, true) : <span className="text-xs text-ink/25">—</span>}
                  {sh && sh !== "off" && <span className="hidden text-[10px] font-semibold text-ink/45 md:block">{shiftTimes[sh]}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* team grid */}
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-forest"><CalendarRange size={20} className="text-[#1D4ED8]" /> {L.team}</h2>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SHIFT) as Shift[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1 text-xs font-bold text-ink/60">
                {badge(k)} {k !== "off" && <span className="hidden sm:inline">{shiftTimes[k]}</span>}
              </span>
            ))}
          </div>
        </div>
        {team.length === 0 ? (
          <p className="p-8 text-center text-ink/55">{L.noTeam}</p>
        ) : (
          <form action={saveRosterWeek}>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[9rem] bg-white px-3 py-2 text-left text-xs font-bold text-ink/45">{km ? "ឈ្មោះ" : "Name"}</th>
                    {days.map((d) => (
                      <th key={d} className={cn("px-1 py-2 text-center text-[11px] font-bold", d === today ? "text-[#1D4ED8]" : "text-ink/45", view === "month" ? "min-w-[2.6rem]" : "min-w-[6rem]")}>
                        <span className="block">{dayName(d)}</span>
                        <span className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs", d === today && "bg-[#1D4ED8] text-white")}>{dayNum(d)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.map((p: any) => (
                    <tr key={p.user_id} className={cn(p.user_id === userId && "bg-[#F8FAFF]")}>
                      <td className="sticky left-0 z-10 border-t border-black/5 bg-inherit px-3 py-2" style={{ background: p.user_id === userId ? "#F8FAFF" : "#fff" }}>
                        <p className="truncate font-bold text-forest">{p.full_name}</p>
                        <p className="truncate text-[11px] text-ink/45">{(km && p.position?.name_km) || p.position?.name}</p>
                      </td>
                      {days.map((d) => {
                        const r: any = cell.get(`${p.user_id}_${d}`);
                        const sh = r?.shift as Shift | undefined;
                        return (
                          <td key={d} className={cn("border-t border-black/5 px-1 py-1.5 text-center", d === today && "bg-[#EEF2FF]/60")}>
                            {manager && view === "week" ? (
                              <select name={`s_${p.user_id}_${d}`} defaultValue={sh ?? ""} className={cn("w-full cursor-pointer rounded-lg border-0 px-1 py-1.5 text-center text-xs font-extrabold ring-1 focus:ring-2 focus:ring-[#2563EB]", sh ? SHIFT[sh].cls : "bg-white text-ink/30 ring-black/10")}>
                                <option value="">—</option>
                                {(Object.keys(SHIFT) as Shift[]).map((k) => <option key={k} value={k}>{km ? SHIFT[k].km : SHIFT[k].en}</option>)}
                              </select>
                            ) : (
                              <>
                                {badge(sh, view === "month")}
                                {r?.note && view === "week" && <span className="mt-0.5 block text-[9px] font-bold uppercase text-ink/35">{r.note === "cover" ? L.cover : r.note === "swap" ? L.swap : ""}</span>}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {manager && view === "week" && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/5 p-3">
                <SubmitButton label={L.save} pendingLabel={L.saving} />
              </div>
            )}
          </form>
        )}
        {manager && view === "week" && team.length > 0 && (
          <form action={copyLastWeek.bind(null, weekStart, ids)} className="border-t border-black/5 px-3 pb-3">
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE] hover:bg-[#EEF2FF]"><Copy size={13} /> {L.copy}</button>
          </form>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* ask */}
        {access.staff && (
          <section className="card p-5">
            <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.ask}</h2>
            <ShiftRequestForm km={km} mine={(myUpcoming ?? []).map((r: any) => ({ id: r.id, label: `${dateLabel(r.day)} · ${km ? SHIFT[r.shift as Shift].km : SHIFT[r.shift as Shift].en}` }))} others={others} />
          </section>
        )}

        <div className="space-y-5">
          {/* manager approvals */}
          {toApprove.length > 0 && (
            <section className="card p-5 ring-2 ring-amber-300">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Clock size={18} className="text-amber-500" /> {L.approve}</h2>
              <div className="space-y-2">
                {toApprove.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-amber-50/60 p-3 ring-1 ring-amber-100">
                    <p className="text-sm text-ink/75">
                      {r.kind === "cover" ? <LifeBuoy size={14} className="-mt-0.5 mr-1 inline text-red-500" /> : <ArrowLeftRight size={14} className="-mt-0.5 mr-1 inline text-[#1D4ED8]" />}
                      <b>{nameOf.get(r.taken_by)}</b> {r.kind === "cover" ? (km ? "ជំនួស" : "covers") : km ? "ដូរជាមួយ" : "swaps with"} <b>{nameOf.get(r.from_user)}</b> · {dateLabel(r.roster.day)} ({km ? SHIFT[r.roster.shift as Shift].km : SHIFT[r.roster.shift as Shift].en})
                      {r.kind === "swap" && r.swap && <> ⇄ {dateLabel(r.swap.day)} ({km ? SHIFT[r.swap.shift as Shift].km : SHIFT[r.swap.shift as Shift].en})</>}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">“{r.reason}”</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <form action={decideShiftRequest.bind(null, r.id, false)}><button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200"><XCircle size={13} /> {L.no}</button></form>
                      <form action={decideShiftRequest.bind(null, r.id, true)}><button className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><CheckCircle2 size={13} /> {L.yes}</button></form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* colleagues who need help */}
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><LifeBuoy size={18} className="text-red-500" /> {L.forMe}</h2>
            {forMe.length === 0 ? (
              <p className="text-sm text-ink/45">{L.nothing}</p>
            ) : (
              <div className="space-y-2">
                {forMe.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-red-50/50 p-3 ring-1 ring-red-100">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold text-forest">{nameOf.get(r.from_user)} · {dateLabel(r.roster.day)} · {km ? SHIFT[r.roster.shift as Shift].km : SHIFT[r.roster.shift as Shift].en}</p>
                      <p className="text-xs text-ink/55">“{r.reason}”{r.kind === "swap" && r.swap && <> · {km ? "ដូរនឹងវេនរបស់អ្នក" : "for your shift"} {dateLabel(r.swap.day)}</>}</p>
                    </div>
                    <form action={acceptShiftRequest.bind(null, r.id)}>
                      <button className="rounded-full bg-[#1D4ED8] px-4 py-2 text-xs font-bold text-white shadow-soft active:scale-95">{r.kind === "cover" ? L.take : L.agree}</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* my requests */}
          {mine.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{L.myReq}</h2>
              <div className="space-y-2">
                {mine.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold text-forest">{r.kind === "cover" ? L.cover : L.swap} · {dateLabel(r.roster.day)}</p>
                      <p className={cn("text-xs font-bold", r.status === "accepted" ? "text-emerald-600" : "text-amber-600")}>{L.st[r.status as "open" | "accepted"]}{r.taken_by && ` (${nameOf.get(r.taken_by)})`}</p>
                    </div>
                    <form action={cancelShiftRequest.bind(null, r.id)}>
                      <button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink/50 ring-1 ring-black/10 hover:text-red-600">{L.cancel}</button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </StaffShell>
  );
}
