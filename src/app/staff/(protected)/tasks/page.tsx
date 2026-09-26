import { CheckCircle2, Circle, Clock, Trash2, User, AlertTriangle, ListChecks } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { TaskForm } from "@/components/staff/StaffExtraForms";
import { TASK_SECTIONS } from "@/lib/staff-extras";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { toggleStaffTask, deleteStaffTask } from "../actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Tasks", "ការងារ");

/** Managers give tasks to a person or a section; staff tick them off. */
export default async function TasksPage({ searchParams }: { searchParams: { v?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const manager = access.admin || access.perms.has("reports");
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const mySections = [...access.perms];
  const since = new Date(Date.now() - (await getStaffSettings()).task_keep_days * 864e5).toISOString();
  const [{ data }, { data: staff }] = await Promise.all([
    db.from("staff_tasks").select("*").or(`status.eq.open,done_at.gte.${since}`).order("status").order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(150),
    db.from("staff_members").select("user_id, full_name").eq("status", "active").order("full_name"),
  ]);
  const nameOf = new Map((staff ?? []).map((s: any) => [s.user_id, s.full_name]));
  const all = (data ?? []) as any[];
  const view = manager && searchParams.v === "all" ? "all" : "mine";
  const rows = view === "all" ? all : all.filter((t) => t.assigned_to === userId || (t.section && mySections.includes(t.section)));
  const open = rows.filter((t) => t.status === "open");
  const done = rows.filter((t) => t.status === "done");
  const pct = rows.length ? Math.round((done.length / rows.length) * 100) : 0;
  const now = Date.now();
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "ការងារចាត់តាំង", sub: "ការងារពីអ្នកគ្រប់គ្រង សម្រាប់អ្នក ឬផ្នែករបស់អ្នក។ ចុចធីកពេលធ្វើរួច។", give: "ចាត់ការងារថ្មី", mine: "ការងាររបស់ខ្ញុំ", all: "ការងារទាំងអស់", open: "ត្រូវធ្វើ", done: "រួចរាល់", none: "គ្មានការងារទេ។ ល្អណាស់! 🎉", due: "មុនម៉ោង", late: "ហួសម៉ោង", by: "ដោយ", you: "អ្នក", p: { low: "ទាប", normal: "ធម្មតា", high: "បន្ទាន់" } }
    : { title: "Tasks", sub: "Jobs from managers for you or your section. Tick them when done.", give: "Give a new task", mine: "My tasks", all: "All tasks", open: "To do", done: "Done", none: "No tasks. Nice work! 🎉", due: "by", late: "late", by: "by", you: "You", p: { low: "Low", normal: "Normal", high: "Urgent" } };

  const Item = ({ t, i }: { t: any; i: number }) => {
    const isDone = t.status === "done";
    const late = !isDone && t.due_at && Date.parse(t.due_at) < now;
    const S = t.section ? TASK_SECTIONS[t.section as keyof typeof TASK_SECTIONS] : null;
    return (
      <li className={cn("card flex animate-[gwzPop_.4s_ease-out_both] items-start gap-3 p-4", t.priority === "high" && !isDone && "ring-2 ring-red-300", isDone && "bg-white/70")} style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
        <form action={toggleStaffTask.bind(null, t.id)}>
          <button className={cn("flex h-11 w-11 items-center justify-center rounded-2xl transition active:scale-90", isDone ? "bg-emerald-500 text-white" : "bg-[#EEF2FF] text-[#93C5FD] hover:text-[#1D4ED8]")} aria-label="done">
            {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold", isDone ? "text-ink/40 line-through decoration-emerald-400" : "text-forest")}>{t.title}</p>
          {t.note && <p className="mt-0.5 text-sm text-ink/60">{t.note}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {t.priority !== "normal" && <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", t.priority === "high" ? "bg-red-500 text-white" : "bg-slate-100 text-ink/55")}>{t.priority === "high" && <AlertTriangle size={11} />} {L.p[t.priority as "low" | "high"]}</span>}
            {S ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[#1E3A8A]"><S.Icon size={11} /> {km ? S.km : S.en}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700"><User size={11} /> {t.assigned_to === userId ? L.you : nameOf.get(t.assigned_to) ?? "—"}</span>
            )}
            {t.due_at && <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", late ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}><Clock size={11} /> {late ? L.late : L.due} {time(t.due_at)}</span>}
            {isDone && t.done_by && <span className="text-emerald-700">✓ {t.done_by === userId ? L.you : nameOf.get(t.done_by) ?? "Admin"} · {time(t.done_at)}</span>}
          </p>
        </div>
        {manager && (
          <form action={deleteStaffTask.bind(null, t.id)}>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/25 transition hover:bg-red-50 hover:text-red-500" aria-label="delete"><Trash2 size={16} /></button>
          </form>
        )}
      </li>
    );
  };

  return (
    <StaffShell
      title={L.title}
      subtitle={L.sub}
      hero={
        <div className="mt-4 max-w-sm">
          <p className="text-sm font-bold text-white/85">{L.done}: {done.length} / {rows.length}</p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/20"><div className="gwz-grow h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div>
        </div>
      }
    >
      <div className={cn("grid items-start gap-5", manager && "lg:grid-cols-[1fr_1.2fr]")}>
        {manager && (
          <section className="card p-5 md:p-6">
            <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.give}</h2>
            <TaskForm km={km} people={(staff ?? []).map((s: any) => ({ id: s.user_id, name: s.full_name }))} />
          </section>
        )}
        <section className="space-y-4">
          {manager && (
            <div className="flex gap-2">
              {(["mine", "all"] as const).map((v) => (
                <a key={v} href={`/staff/tasks?v=${v}`} className={cn("rounded-full px-4 py-2 text-sm font-bold shadow-soft", view === v ? "bg-[#1D4ED8] text-white" : "bg-white text-[#1E3A8A]")}>{v === "all" ? L.all : L.mine}</a>
              ))}
            </div>
          )}
          {rows.length === 0 && (
            <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-ink/55"><ListChecks size={36} className="text-[#93C5FD]" /> {L.none}</div>
          )}
          {open.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-forest">{L.open} <span className="rounded-full bg-[#1D4ED8] px-2 text-xs text-white">{open.length}</span></h3>
              <ul className="space-y-2">{open.map((t, i) => <Item key={t.id} t={t} i={i} />)}</ul>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-emerald-700">{L.done} <span className="rounded-full bg-emerald-500 px-2 text-xs text-white">{done.length}</span></h3>
              <ul className="space-y-2">{done.map((t, i) => <Item key={t.id} t={t} i={i} />)}</ul>
            </div>
          )}
        </section>
      </div>
    </StaffShell>
  );
}
