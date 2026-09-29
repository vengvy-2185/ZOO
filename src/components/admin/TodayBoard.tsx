import Link from "next/link";
import { Activity, UserCheck, AlarmClock, UserX, LifeBuoy, Banknote, Users, Siren } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAttendanceSettings } from "@/lib/server/attendance";
import { cn } from "@/lib/utils/cn";

const TZ = "Asia/Phnom_Penh";
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** Admin home: today at a glance — who works, who is late or missing, covers, cash, visitors. */
export async function TodayBoard() {
  const db = createServiceRoleClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
  const now = h * 60 + m;
  const s = await getAttendanceSettings();
  const [{ data: roster }, { data: checks }, { data: staff }, { data: gate }, { data: checkins }, { data: closes }, { data: sos }] = await Promise.all([
    db.from("staff_roster").select("user_id, shift, note, cover_user").eq("day", today),
    db.from("staff_session_checks").select("user_id, session, late_minutes, status, checked_at").eq("day", today),
    db.from("staff_members").select("user_id, full_name, staff_no").eq("status", "active"),
    db.from("gate_entries").select("count").eq("entry_date", today),
    db.from("visitor_checkins").select("visitors_count").gte("checked_in_at", new Date(`${today}T00:00:00+07:00`).toISOString()),
    db.from("staff_cash_closes").select("user_id, status, diff_usd").eq("day", today),
    db.from("staff_alerts").select("id").eq("status", "open"),
  ]);
  // a cover can be done by an admin account (not on the staff list): use the profile name
  const outside = [...new Set((roster ?? []).map((r: any) => r.user_id).filter((u: string) => !(staff ?? []).some((p: any) => p.user_id === u)))];
  const { data: profiles } = outside.length ? await db.from("profiles").select("id, full_name").in("id", outside) : { data: [] as any[] };
  const name = (id: string) => (staff ?? []).find((p: any) => p.user_id === id)?.full_name ?? (profiles ?? []).find((p: any) => p.id === id)?.full_name ?? "Admin";
  const activeIds = new Set((staff ?? []).map((p: any) => p.user_id));
  const session = now < toMin(s.afternoon_start) - 30 ? "morning" : "afternoon";
  const sessionStart = toMin(session === "morning" ? s.morning_start : s.afternoon_start);
  const sessionEnd = toMin(session === "morning" ? s.morning_end : s.afternoon_end);
  // people whose shift covers the current half of the day
  const due = (roster ?? []).filter((r: any) => activeIds.has(r.user_id) && (r.shift === "full" || r.shift === session));
  const checkOf = (u: string) => (checks ?? []).find((c: any) => c.user_id === u && c.session === session && (c.status ?? "present") === "present");
  const working = due.filter((r: any) => checkOf(r.user_id));
  const late = working.filter((r: any) => (checkOf(r.user_id)?.late_minutes ?? 0) > 0);
  const missing = now >= sessionStart + s.grace_minutes ? due.filter((r: any) => !checkOf(r.user_id)) : [];
  const covers = (roster ?? []).filter((r: any) => r.note === "cover");
  const visitors = (gate ?? []).reduce((n: number, g: any) => n + g.count, 0) + (checkins ?? []).reduce((n: number, c: any) => n + (c.visitors_count ?? 0), 0);
  const closed = (closes ?? []).length;
  const waiting = (closes ?? []).filter((c: any) => c.status === "submitted").length;
  const off = (closes ?? []).filter((c: any) => Math.abs(Number(c.diff_usd)) > 1).length;
  const half = session === "morning" ? "វេនព្រឹក" : "វេនរសៀល";

  const tiles = [
    { Icon: UserCheck, k: `កំពុងធ្វើការ (${half})`, v: `${working.length}/${due.length}`, tone: "from-emerald-500 to-emerald-700", href: "/staff/team" },
    { Icon: AlarmClock, k: "មកយឺត", v: String(late.length), tone: "from-amber-400 to-orange-600", href: "/staff/team" },
    { Icon: UserX, k: now >= sessionEnd ? "អវត្តមាន" : "មិនទាន់មក", v: String(missing.length), tone: "from-rose-500 to-red-700", href: "/staff/team" },
    { Icon: LifeBuoy, k: "ការជំនួសថ្ងៃនេះ", v: String(covers.length), tone: "from-violet-500 to-purple-700", href: "/staff/roster" },
    { Icon: Banknote, k: "បិទបញ្ជីប្រាក់", v: String(closed), tone: "from-sky-500 to-blue-700", href: "/staff/cash" },
    { Icon: Users, k: "ភ្ញៀវថ្ងៃនេះ", v: String(visitors), tone: "from-teal-500 to-emerald-800", href: "/admin/visitors" },
  ];

  return (
    <section className="card mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 font-display text-lg font-extrabold text-forest"><Activity size={19} className="text-primary" /> ថ្ងៃនេះនៅសួនសត្វ</h2>
        {(sos ?? []).length > 0 && (
          <Link href="/staff/sos" className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white"><Siren size={14} /> SOS {(sos ?? []).length}</Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.k} href={t.href} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-soft transition hover:-translate-y-0.5", t.tone)}>
            <t.Icon size={56} className="pointer-events-none absolute -bottom-2 -right-2 text-white/15" />
            <p className="text-xs font-bold text-white/90">{t.k}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{t.v}</p>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-cream/70 p-3">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/45">{now >= sessionEnd ? "អវត្តមាន" : "មិនទាន់ស្កេនវត្តមាន"}</p>
          {missing.length ? <p className="text-sm font-semibold text-red-700">{missing.map((r: any) => name(r.user_id)).join(" · ")}</p> : <p className="text-sm text-ink/50">គ្មាន ✓</p>}
        </div>
        <div className="rounded-2xl bg-cream/70 p-3">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/45">ការជំនួស</p>
          {covers.length ? <p className="text-sm font-semibold text-violet-700">{covers.map((r: any) => `${name(r.user_id)} ជំនួស ${name(r.cover_user)}`).join(" · ")}</p> : <p className="text-sm text-ink/50">គ្មាន</p>}
        </div>
        <div className="rounded-2xl bg-cream/70 p-3">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/45">បិទបញ្ជីប្រាក់</p>
          <p className="text-sm text-ink/70">{closed ? `បិទ ${closed} · រង់ចាំពិនិត្យ ${waiting}${off ? ` · ខុសគ្នា ${off}` : ""}` : "មិនទាន់មាននរណាបិទបញ្ជីនៅឡើយ"}</p>
        </div>
      </div>
    </section>
  );
}
