import Link from "next/link";
import { ScanLine, PawPrint, Sparkles, Map, BarChart3, HandHeart, Package, ChevronRight, ListChecks, NotebookPen, type LucideIcon } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";
import { todaysEvents } from "@/lib/data/events";
import type { Permission } from "@/lib/server/staff";

type Card = { href: string; Icon: LucideIcon; title: string; big: string; line: string; pct: number | null; from: string; to: string };

/**
 * Home page, "My section today": one live card for each job the person
 * does (tickets, animals, cleaning, guide, manager), plus thanks and supplies.
 */
export async function MySection({ userId, perms, km }: { userId: string; perms: Set<Permission>; km: boolean }) {
  const db = createServiceRoleClient();
  const today = zooToday();
  const since = `${today}T00:00:00+07:00`;
  const monthStart = `${today.slice(0, 7)}-01T00:00:00+07:00`;
  const has = (p: Permission) => perms.has(p);
  const none = Promise.resolve({ data: [] as any[], count: 0 });

  const [scans, gate, animals, fed, zones, facilities, cleanTicks, eventTicks, eventCounts, openIssues, waitingSupplies, kudos, mySupplies] = await Promise.all([
    has("tickets") ? db.from("visitor_checkins").select("visitors_count").eq("checked_in_by", userId).gte("checked_in_at", since) : none,
    has("tickets") ? db.from("gate_entries").select("count").eq("created_by", userId).eq("entry_date", today) : none,
    has("animals") ? db.from("animals").select("id", { count: "exact", head: true }).eq("status", "active") : none,
    has("animals") ? db.from("animal_care_logs").select("animal_id").eq("kind", "feeding").gte("created_at", since) : none,
    has("cleaning") ? db.from("zoo_zones").select("id", { count: "exact", head: true }).eq("is_active", true) : none,
    has("cleaning") ? db.from("facilities").select("id", { count: "exact", head: true }).eq("is_active", true) : none,
    has("cleaning") ? db.from("staff_task_checks").select("ref").eq("kind", "cleaning").eq("check_date", today) : none,
    has("guide") ? db.from("staff_task_checks").select("ref").eq("kind", "event").eq("check_date", today) : none,
    has("guide") ? db.from("staff_event_counts").select("visitors").eq("day", today) : none,
    has("reports") ? db.from("staff_issues").select("id", { count: "exact", head: true }).neq("status", "done") : none,
    has("reports") ? db.from("staff_supply_requests").select("id", { count: "exact", head: true }).eq("status", "pending") : none,
    db.from("staff_kudos").select("id", { count: "exact", head: true }).eq("to_user", userId).gte("created_at", monthStart),
    db.from("staff_supply_requests").select("status").eq("user_id", userId).in("status", ["pending", "approved"]),
  ]);

  // tasks for me or my sections, and the newest handover note for my sections
  const secs = [...perms];
  const [{ data: taskRows }, { data: lastNote }] = await Promise.all([
    db.from("staff_tasks").select("assigned_to, section, priority").eq("status", "open"),
    db.from("staff_handover").select("note, section, created_at").in("section", [...secs.filter((x) => x !== "reports"), "general"]).order("created_at", { ascending: false }).limit(1),
  ]);
  const myTasks = (taskRows ?? []).filter((t: any) => t.assigned_to === userId || (t.section && perms.has(t.section)));
  const urgentTasks = myTasks.filter((t: any) => t.priority === "high").length;
  const note = (lastNote ?? [])[0] as any;

  const cards: Card[] = [];
  if (has("tickets")) {
    const people = (scans.data ?? []).reduce((n: number, r: any) => n + (r.visitors_count ?? 0), 0);
    const walkIns = (gate.data ?? []).reduce((n: number, r: any) => n + (r.count ?? 0), 0);
    cards.push({ href: "/staff/scanner", Icon: ScanLine, title: km ? "វេនសំបុត្ររបស់ខ្ញុំ" : "My ticket shift", big: String(people + walkIns), line: km ? `ស្កេន ${(scans.data ?? []).length} សំបុត្រ (${people} នាក់) · រាប់ ${walkIns} នាក់` : `${(scans.data ?? []).length} tickets scanned (${people}) · ${walkIns} walk-ins`, pct: null, from: "#3B82F6", to: "#1E3A8A" });
  }
  if (has("animals")) {
    const total = animals.count ?? 0;
    const fedN = new Set((fed.data ?? []).map((r: any) => r.animal_id)).size;
    cards.push({ href: "/staff/animals?tab=board", Icon: PawPrint, title: km ? "ឲ្យចំណីថ្ងៃនេះ" : "Fed today", big: `${fedN}/${total}`, line: km ? `នៅសល់ ${Math.max(0, total - fedN)} ក្បាលមិនទាន់ឲ្យចំណី` : `${Math.max(0, total - fedN)} still to feed`, pct: total ? fedN / total : 0, from: "#F59E0B", to: "#B45309" });
  }
  if (has("cleaning")) {
    const total = (zones.count ?? 0) + (facilities.count ?? 0);
    const done = new Set((cleanTicks.data ?? []).map((r: any) => r.ref)).size;
    cards.push({ href: "/staff/cleaning", Icon: Sparkles, title: km ? "កន្លែងសម្អាតរួច" : "Spots cleaned", big: `${done}/${total}`, line: km ? `នៅសល់ ${Math.max(0, total - done)} កន្លែង` : `${Math.max(0, total - done)} to go`, pct: total ? done / total : 0, from: "#2DD4BF", to: "#0F766E" });
  }
  if (has("guide")) {
    const events = todaysEvents();
    const done = new Set((eventTicks.data ?? []).map((r: any) => r.ref)).size;
    const audience = (eventCounts.data ?? []).reduce((n: number, r: any) => n + r.visitors, 0);
    cards.push({ href: "/staff/schedule", Icon: Map, title: km ? "កម្មវិធីថ្ងៃនេះ" : "Today's shows", big: `${done}/${events.length}`, line: km ? `ភ្ញៀវចូលរួម ${audience} នាក់` : `${audience} visitors at shows`, pct: events.length ? done / events.length : 0, from: "#A78BFA", to: "#6D28D9" });
  }
  if (has("reports")) {
    cards.push({ href: "/staff/supplies", Icon: BarChart3, title: km ? "ត្រូវដោះស្រាយ" : "Needs you", big: String((openIssues.count ?? 0) + (waitingSupplies.count ?? 0)), line: km ? `បញ្ហា ${openIssues.count ?? 0} · សុំសម្ភារៈ ${waitingSupplies.count ?? 0}` : `${openIssues.count ?? 0} problems · ${waitingSupplies.count ?? 0} supply requests`, pct: null, from: "#F472B6", to: "#BE185D" });
  }
  const mineOpen = (mySupplies.data ?? []).length;
  const mineApproved = (mySupplies.data ?? []).filter((r: any) => r.status === "approved").length;

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{km ? "ផ្នែករបស់ខ្ញុំថ្ងៃនេះ" : "My section today"}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Link key={c.href} href={c.href} className="group relative animate-[gwzPop_.45s_ease-out_both] overflow-hidden rounded-3xl p-4 text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, animationDelay: `${i * 70}ms` }}>
            <c.Icon size={90} className="pointer-events-none absolute -bottom-4 -right-3 text-white/10 transition group-hover:rotate-6 group-hover:scale-110" />
            <div className="relative flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><c.Icon size={18} /></span>
              <span className="text-sm font-bold text-white/90">{c.title}</span>
            </div>
            <p className="relative mt-3 font-display text-4xl font-extrabold leading-none">{c.big}</p>
            <p className="relative mt-1 text-xs font-semibold text-white/85">{c.line}</p>
            {c.pct !== null && (
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="gwz-grow h-full rounded-full bg-white" style={{ width: `${Math.round(c.pct * 100)}%`, animationDelay: `${200 + i * 70}ms` }} />
              </div>
            )}
          </Link>
        ))}
      </div>
      {/* thanks + my supplies: for everyone */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link href="/staff/tasks" className={`group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${urgentTasks ? "ring-2 ring-red-300" : ""}`}>
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-700 text-white shadow-sm transition group-hover:scale-110">
            <ListChecks size={22} />
            {myTasks.length > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-extrabold ring-2 ring-white">{myTasks.length}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold text-forest">{km ? "ការងាររបស់ខ្ញុំ" : "My tasks"}</span>
            <span className="block text-xs text-ink/55">{myTasks.length ? (km ? `${myTasks.length} ត្រូវធ្វើ${urgentTasks ? ` · ${urgentTasks} បន្ទាន់` : ""}` : `${myTasks.length} to do${urgentTasks ? ` · ${urgentTasks} urgent` : ""}`) : km ? "គ្មានការងារនៅសល់ 🎉" : "Nothing left to do 🎉"}</span>
          </span>
          <ChevronRight size={18} className="text-ink/25" />
        </Link>
        <Link href="/staff/handover" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-700 text-white shadow-sm transition group-hover:scale-110"><NotebookPen size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold text-forest">{km ? "ប្រគល់វេន" : "Handover"}</span>
            <span className="line-clamp-1 block text-xs text-ink/55">{note ? `“${note.note}”` : km ? "សរសេរកំណត់ចំណាំសម្រាប់វេនបន្ទាប់" : "Leave a note for the next shift"}</span>
          </span>
          <ChevronRight size={18} className="text-ink/25" />
        </Link>
        <Link href="/staff/kudos" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-600 text-white shadow-sm transition group-hover:scale-110"><HandHeart size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold text-forest">{km ? "ពាក្យអរគុណ" : "Thanks"}</span>
            <span className="block text-xs text-ink/55">{km ? `ទទួលបាន ${kudos.count ?? 0} ដងខែនេះ · អរគុណមិត្ត` : `${kudos.count ?? 0} this month · thank a colleague`}</span>
          </span>
          <ChevronRight size={18} className="text-ink/25" />
        </Link>
        <Link href="/staff/supplies" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-sm transition group-hover:scale-110"><Package size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold text-forest">{km ? "សុំសម្ភារៈ" : "Supplies"}</span>
            <span className="block text-xs text-ink/55">{mineOpen ? (km ? `${mineOpen} សំណើកំពុងដំណើរការ · ${mineApproved} បានយល់ព្រម` : `${mineOpen} open · ${mineApproved} approved`) : km ? "ស្នើសុំរបស់ដែលផ្នែកអ្នកត្រូវការ" : "Ask for what your section needs"}</span>
          </span>
          <ChevronRight size={18} className="text-ink/25" />
        </Link>
      </div>
    </section>
  );
}
