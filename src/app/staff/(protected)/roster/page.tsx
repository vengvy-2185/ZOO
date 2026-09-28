import Link from "next/link";
import { Settings2, Wand2, CalendarRange, ChevronLeft, ChevronRight, Copy, LifeBuoy, ArrowLeftRight, CheckCircle2, XCircle, Clock, UserCheck } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getAttendanceSettings, localDay } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { SubmitButton } from "@/components/admin/ui-client";
import { ActionButton } from "@/components/staff/ActionButton";
import { RosterGrid } from "@/components/staff/RosterGrid";
import { SHIFT_UI, SHIFTS } from "@/lib/roster-ui";
import { ShiftRequestForm } from "@/components/staff/ShiftRequestForm";
import { TASK_SECTIONS } from "@/lib/staff-extras";
import { saveRosterWeek, copyLastWeek, autoFillWeek, saveRosterRules, acceptShiftRequest, cancelShiftRequest, decideShiftRequest } from "../actions";
import { cn } from "@/lib/utils/cn";
import { ensureHolidays } from "@/lib/server/holidays";
import { ensureAutoRoster, getRosterRules, ROSTER_SECTIONS } from "@/lib/server/roster";

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

  // automatic mode: this week and next are planned for anyone with nothing yet
  await ensureHolidays(today).catch(() => {});
  await ensureAutoRoster(today).catch(() => {});
  const rules = await getRosterRules();
  const db = createServiceRoleClient();
  const [{ data: staffRows }, s] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, staff_no, position:staff_positions(name, name_km, permissions)").eq("status", "active").order("full_name"),
    getAttendanceSettings(),
  ]);
  // each person's main team (managers go last), so "everyone" is grouped by team
  const ORDER = ["tickets", "animals", "cleaning", "guide", "reports"] as const;
  const primaryOf = (p: any) => {
    const perms: string[] = p.position?.permissions ?? [];
    if (perms.includes("reports")) return "reports";
    return ORDER.find((k) => perms.includes(k)) ?? "reports";
  };
  const team = (staffRows ?? [])
    .filter((p: any) => !section || (p.position?.permissions ?? []).includes(section))
    .sort((a: any, b: any) => ORDER.indexOf(primaryOf(a) as any) - ORDER.indexOf(primaryOf(b) as any) || String(a.full_name).localeCompare(String(b.full_name)));
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
    ? { title: "កាលវិភាគការងារ", sub: "វេនធ្វើការប្រចាំសប្តាហ៍ និងប្រចាំខែ របស់ក្រុមនីមួយៗ។ ប្តូរវេន ឬរកអ្នកជំនួស ពេលមានបញ្ហា។", week: "សប្តាហ៍", month: "ខែ", all: "ទាំងអស់", save: "រក្សាទុកកាលវិភាគ", saving: "កំពុងរក្សាទុក…", copy: "ចម្លងសប្តាហ៍មុន", mine: "វេនរបស់ខ្ញុំសប្តាហ៍នេះ", team: "កាលវិភាគក្រុមទាំងមូល", ask: "មកធ្វើការមិនបាន? ស្នើអ្នកជំនួស ឬប្តូរវេន", forMe: "មិត្តរួមការងារកំពុងរកអ្នកជំនួស", myReq: "សំណើរបស់ខ្ញុំ", approve: "រង់ចាំអ្នកគ្រប់គ្រងអនុម័ត", take: "ខ្ញុំជំនួស", agree: "យល់ព្រមដូរ", cancel: "បោះបង់", yes: "អនុម័ត", no: "បដិសេធ", st: { open: "រង់ចាំអ្នកជំនួស", accepted: "មានអ្នកទទួលហើយ · រង់ចាំអនុម័ត" }, cover: "ជំនួស", swap: "ដូរ", nothing: "គ្មានទេ", none: "—", legend: "ពន្យល់", today: "ថ្ងៃនេះ", noTeam: "មិនមានបុគ្គលិកក្នុងក្រុមនេះទេ។" }
    : { title: "Work schedule", sub: "Each team's shifts by week or month. Swap a shift or find cover when something comes up.", week: "Week", month: "Month", all: "Everyone", save: "Save schedule", saving: "Saving…", copy: "Copy last week", mine: "My shifts this week", team: "Whole team schedule", ask: "Can't come? Ask for cover or a swap", forMe: "Colleagues looking for cover", myReq: "My requests", approve: "Waiting for approval", take: "I'll cover", agree: "Agree to swap", cancel: "Cancel", yes: "Approve", no: "Refuse", st: { open: "Looking for cover", accepted: "Taken · waiting for approval" }, cover: "Cover", swap: "Swap", nothing: "Nothing", none: "—", legend: "Key", today: "Today", noTeam: "No staff in this team." };
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

      {/* the rules the automatic schedule follows (managers) */}
      {manager && (
        <details className="card group p-0">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Settings2 size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-extrabold text-forest">{km ? "ច្បាប់រៀបកាលវិភាគស្វ័យប្រវត្តិ" : "Automatic schedule rules"}</span>
              <span className="block text-xs font-semibold text-ink/50">{rules.auto ? (km ? "ស្វ័យប្រវត្តិ៖ បើក" : "Automatic: on") : km ? "ស្វ័យប្រវត្តិ៖ បិទ" : "Automatic: off"} · {km ? `ឈប់ ${rules.days_off} ថ្ងៃ/សប្តាហ៍` : `${rules.days_off} day(s) off a week`}</span>
            </span>
            <ChevronRight size={18} className="text-ink/40 transition group-open:rotate-90" />
          </summary>
          <form action={saveRosterRules} className="space-y-4 px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800"><input type="checkbox" name="auto" defaultChecked={rules.auto} className="h-4 w-4 accent-violet-600" /> {km ? "រៀបចំស្វ័យប្រវត្តិ (សប្តាហ៍នេះ និងសប្តាហ៍ក្រោយ)" : "Plan by itself (this week and next)"}</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-ink/70"><input type="checkbox" name="allow_full" defaultChecked={rules.allow_full} className="h-4 w-4 accent-violet-600" /> {km ? "អនុញ្ញាតពេញថ្ងៃ ពេលខ្វះមនុស្ស" : "Full day when short of people"}</label>
              <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-ink/70">{km ? "ថ្ងៃឈប់/សប្តាហ៍" : "Days off / week"} <input name="days_off" type="number" min={0} max={6} defaultValue={rules.days_off} className="w-14 rounded-lg border border-black/10 px-2 py-1 text-center" /></label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-ink/45">
                    <th className="py-1 pr-2">{km ? "ក្រុម" : "Team"}</th>
                    <th className="px-2 py-1 text-center">{km ? "ត្រូវការពេលព្រឹក (នាក់)" : "Needed mornings"}</th>
                    <th className="px-2 py-1 text-center">{km ? "ត្រូវការពេលរសៀល (នាក់)" : "Needed afternoons"}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROSTER_SECTIONS.map((sec) => {
                    const T = TASK_SECTIONS[sec];
                    return (
                      <tr key={sec} className="border-t border-black/5">
                        <td className="py-2 pr-2 font-bold text-forest"><T.Icon size={14} className="-mt-0.5 mr-1.5 inline text-[#1D4ED8]" />{km ? T.km : T.en}</td>
                        <td className="px-2 py-2 text-center"><input name={`am_${sec}`} type="number" min={0} max={50} defaultValue={rules.need[sec].am} className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-center" /></td>
                        <td className="px-2 py-2 text-center"><input name={`pm_${sec}`} type="number" min={0} max={50} defaultValue={rules.need[sec].pm} className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-center" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><SubmitButton label={km ? "រក្សាទុកច្បាប់" : "Save rules"} pendingLabel="…" /></div>
          </form>
        </details>
      )}

      {/* how it works */}
      <details className="card group p-0">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8]"><CalendarRange size={20} /></span>
          <span className="flex-1 font-display text-lg font-extrabold text-forest">{km ? "កាលវិភាគនេះប្រើយ៉ាងម៉េច?" : "How does the schedule work?"}</span>
          <ChevronRight size={18} className="text-ink/40 transition group-open:rotate-90" />
        </summary>
        <ol className="grid gap-3 px-4 pb-4 md:grid-cols-3">
          {(km
            ? [
                ["១", "អ្នកគ្រប់គ្រងរៀបចំវេន", "កំណត់ថ្ងៃណា អ្នកណាមកធ្វើការ ពេលព្រឹក រសៀល ពេញថ្ងៃ ឬឈប់សម្រាក។"],
                ["២", "បុគ្គលិកមើលវេនរបស់ខ្លួន", "មើល «វេនរបស់ខ្ញុំ» ដើម្បីដឹងថាថ្ងៃណាត្រូវមក និងម៉ោងប៉ុន្មាន។"],
                ["៣", "មកមិនបាន? ស្នើនៅទីនេះ", "សុំអ្នកជំនួស ឬប្តូរវេនជាមួយមិត្ត → មិត្តយល់ព្រម → អ្នកគ្រប់គ្រងអនុម័ត → វេនប្តូរដោយខ្លួនឯង។"],
              ]
            : [
                ["1", "Managers plan the shifts", "Who works which day: morning, afternoon, full day or day off."],
                ["2", "Staff see their shifts", "Look at “My shifts” to know which days to come and what time."],
                ["3", "Can't come? Ask here", "Ask for cover or a swap → a colleague agrees → a manager approves → the schedule updates."],
              ]
          ).map(([n, t, d]) => (
            <li key={n} className="flex gap-3 rounded-2xl bg-[#F8FAFF] p-3 ring-1 ring-[#2563EB]/10">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] font-display text-base font-extrabold text-white">{n}</span>
              <span>
                <span className="block font-bold text-forest">{t}</span>
                <span className="block text-sm leading-relaxed text-ink/60">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </details>

      {/* my shifts */}
      {access.staff && !manager && view === "week" && (
        <section className="card p-4 md:p-5">
          {(() => {
            const nx = (myUpcoming ?? [])[0] as any;
            return (
              <div className={cn("mb-4 flex items-center gap-3 rounded-2xl p-4", nx ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white" : "bg-slate-50 text-ink/60")}>
                <Clock size={26} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold", nx ? "text-white/80" : "")}>{km ? "វេនបន្ទាប់របស់អ្នក" : "Your next shift"}</p>
                  <p className="font-display text-xl font-extrabold leading-tight">
                    {nx ? `${nx.day === today ? (km ? "ថ្ងៃនេះ" : "Today") : dateLabel(nx.day)} · ${km ? SHIFT[nx.shift as Shift].km : SHIFT[nx.shift as Shift].en} ${shiftTimes[nx.shift as Shift]}` : km ? "មិនទាន់មានវេន — រង់ចាំអ្នកគ្រប់គ្រងរៀបចំ" : "No shifts yet — waiting for a manager"}
                  </p>
                </div>
              </div>
            );
          })()}
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><UserCheck size={20} className="text-[#1D4ED8]" /> {L.mine}</h2>
          <ul className="space-y-2">
            {myWeek.map((d) => {
              const r: any = cell.get(`${userId}_${d}`);
              const sh = r?.shift as Shift | undefined;
              return (
                <li key={d} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1", d === today ? "bg-[#EEF2FF] ring-[#93C5FD]" : "bg-white ring-black/5")}>
                  <span className={cn("flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl leading-none", d === today ? "bg-[#1D4ED8] text-white" : "bg-slate-100 text-forest")}>
                    <span className="text-[10px] font-bold opacity-80">{dayName(d)}</span>
                    <span className="font-display text-lg font-extrabold">{dayNum(d)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-forest">{dayName(d, "long")}{d === today && <span className="ml-2 rounded-full bg-[#1D4ED8] px-2 py-0.5 text-[11px] text-white">{L.today}</span>}</span>
                    <span className="block text-sm text-ink/55">{sh && sh !== "off" ? shiftTimes[sh] : sh === "off" ? (km ? "សម្រាក" : "Rest day") : km ? "មិនទាន់កំណត់" : "Not planned yet"}</span>
                  </span>
                  {sh ? badge(sh) : <span className="text-sm text-ink/30">—</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* team grid */}
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-3">
          <h2 className="flex flex-1 items-center gap-2 font-display text-xl font-extrabold text-forest"><CalendarRange size={20} className="text-[#1D4ED8]" /> {L.team}</h2>
          {manager && team.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                action={autoFillWeek.bind(null, view === "week" ? weekStart : monday(today), section, false)}
                icon={<Wand2 size={15} />}
                label={km ? "រៀបចំស្វ័យប្រវត្តិ" : "Auto-plan"}
                doneLabel={km ? "រួចរាល់" : "Done"}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-soft"
              />
              <ActionButton
                action={autoFillWeek.bind(null, view === "week" ? weekStart : monday(today), section, true)}
                icon={<Wand2 size={14} />}
                label={km ? "រៀបចំឡើងវិញ" : "Re-plan"}
                doneLabel={km ? "រួចរាល់" : "Done"}
                confirm={km ? "រៀបចំឡើងវិញទាំងអស់សម្រាប់សប្តាហ៍នេះ? វេនដែលកែដោយដៃនឹងត្រូវជំនួស។" : "Re-plan the whole week? Boxes changed by hand will be replaced."}
                className="text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
              />
              <ActionButton
                action={copyLastWeek.bind(null, view === "week" ? weekStart : monday(today), ids)}
                icon={<Copy size={14} />}
                label={L.copy}
                doneLabel={km ? "បានចម្លង" : "Copied"}
                className="text-[#1D4ED8] ring-1 ring-[#BFDBFE] hover:bg-[#EEF2FF]"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-black/5 px-4 py-2">
          {SHIFTS.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60">
              <span className={cn("h-2.5 w-2.5 rounded-full", SHIFT_UI[k].dot)} /> {km ? SHIFT_UI[k].km : SHIFT_UI[k].en}
              {k !== "off" && <span className="font-semibold text-ink/40">{shiftTimes[k]}</span>}
            </span>
          ))}
        </div>
        <RosterGrid
          km={km}
          editable={manager}
          compact={view === "month"}
          times={shiftTimes}
          save={saveRosterWeek}
          need={(section ? [section] : ROSTER_SECTIONS.filter((k) => (team as any[]).some((p) => primaryOf(p) === k))).reduce((n, k) => (k in rules.need ? { am: n.am + rules.need[k as keyof typeof rules.need].am, pm: n.pm + rules.need[k as keyof typeof rules.need].pm } : n), { am: 0, pm: 0 })}
          days={days.map((d) => ({ day: d, name: dayName(d), num: dayNum(d), today: d === today }))}
          cells={Object.fromEntries((roster ?? []).map((r: any) => [`${r.user_id}_${r.day}`, { shift: r.shift, note: r.note }]))}
          groups={(() => {
            const out: { key: string; label: string; people: { id: string; name: string; role: string; me: boolean }[] }[] = [];
            for (const p of team as any[]) {
              const key = section ? "one" : primaryOf(p);
              let g = out.find((x) => x.key === key);
              if (!g) {
                const T = TASK_SECTIONS[key as keyof typeof TASK_SECTIONS];
                g = { key, label: section ? "" : T ? (km ? T.km : T.en) : "", people: [] };
                out.push(g);
              }
              g.people.push({ id: p.user_id, name: p.full_name, role: (km && p.position?.name_km) || p.position?.name || "", me: p.user_id === userId });
            }
            return out;
          })()}
        />
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
                      <ActionButton action={decideShiftRequest.bind(null, r.id, false)} icon={<XCircle size={14} />} label={L.no} className="text-red-600 ring-1 ring-red-200 hover:bg-red-50" />
                      <ActionButton action={decideShiftRequest.bind(null, r.id, true)} icon={<CheckCircle2 size={14} />} label={L.yes} className="bg-emerald-600 text-white hover:bg-emerald-700" />
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
                    <ActionButton action={acceptShiftRequest.bind(null, r.id)} label={r.kind === "cover" ? L.take : L.agree} doneLabel={km ? "បានទទួល" : "Taken"} className="bg-[#1D4ED8] text-white shadow-soft" />
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
                    <ActionButton action={cancelShiftRequest.bind(null, r.id)} label={L.cancel} className="text-ink/55 ring-1 ring-black/10 hover:text-red-600" />
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
