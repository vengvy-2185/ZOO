import { NotebookPen } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { HandoverForm } from "@/components/staff/StaffExtraForms";
import { SUPPLY_SECTIONS, type Section } from "@/lib/staff-extras";
import { getStaffSettings } from "@/lib/server/staff-settings";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Shift handover", "ប្រគល់វេន");

/** End-of-shift notes, so the next person in the same section knows what happened. */
export default async function HandoverPage() {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const { locale } = getI18n();
  const km = locale === "km";
  const sections: Section[] = (["tickets", "animals", "cleaning", "guide"] as const).filter((s) => access.perms.has(s));
  sections.push("general");
  const db = createServiceRoleClient();
  const [{ data }, { data: staff }] = await Promise.all([
    db.from("staff_handover").select("*").in("section", sections).order("created_at", { ascending: false }).limit(40),
    db.from("staff_members").select("user_id, full_name"),
  ]);
  const nameOf = new Map((staff ?? []).map((s: any) => [s.user_id, s.full_name]));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const { handover_new_hours } = await getStaffSettings();
  const fresh = (iso: string) => Date.now() - Date.parse(iso) < handover_new_hours * 3600e3;
  const L = km
    ? { title: "ប្រគល់វេន", sub: "សរសេរអ្វីដែលវេនបន្ទាប់ត្រូវដឹង មុនពេលអ្នកចេញ។ អ្នកធ្វើការផ្នែកដូចគ្នាឃើញភ្លាម។", write: "សរសេរកំណត់ចំណាំ", latest: "កំណត់ចំណាំថ្មីៗ", none: "មិនទាន់មានកំណត់ចំណាំទេ។", isNew: "ថ្មី" }
    : { title: "Shift handover", sub: "Before you leave, write what the next shift should know. People in the same section see it straight away.", write: "Write a note", latest: "Latest notes", none: "No notes yet.", isNew: "New" };

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.write}</h2>
          <HandoverForm km={km} sections={sections} />
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{L.latest}</h2>
          {(data ?? []).length === 0 && <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-ink/55"><NotebookPen size={36} className="text-[#93C5FD]" /> {L.none}</div>}
          {/* a timeline down the left */}
          <ol className="relative space-y-3 border-l-2 border-[#DBEAFE] pl-5">
            {(data ?? []).map((h: any, i: number) => {
              const X = SUPPLY_SECTIONS[h.section as Section] ?? SUPPLY_SECTIONS.general;
              return (
                <li key={h.id} className="relative animate-[gwzPop_.4s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <span className="absolute -left-[1.95rem] top-4 flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-[#F4F7FF]" style={{ background: X.color }}><X.Icon size={12} /></span>
                  <div className={`card p-4 ${fresh(h.created_at) ? "ring-2 ring-[#BFDBFE]" : ""}`}>
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: X.color }}>{km ? X.km : X.en}</span>
                      <span className="font-bold text-forest">{h.user_id === userId ? (km ? "អ្នក" : "You") : nameOf.get(h.user_id) ?? "Admin"}</span>
                      <span className="text-ink/45">{when(h.created_at)}</span>
                      {fresh(h.created_at) && <span className="rounded-full bg-[#1D4ED8] px-2 py-0.5 font-bold text-white">{L.isNew}</span>}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-ink/75">{h.note}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </StaffShell>
  );
}
