import Link from "next/link";
import { History, CalendarRange, Users, Wallet, Settings2, Banknote } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

// what each action means, in plain words
const WHAT: Record<string, { km: string; en: string }> = {
  "roster.edit": { km: "កែប្រអប់កាលវិភាគ", en: "Edited schedule boxes" },
  "roster.plan": { km: "រៀបកាលវិភាគស្វ័យប្រវត្តិ", en: "Auto-planned the schedule" },
  "roster.copy": { km: "ចម្លងកាលវិភាគសប្តាហ៍មុន", en: "Copied last week's schedule" },
  "roster.rules": { km: "ប្តូរច្បាប់កាលវិភាគ", en: "Changed the schedule rules" },
  "roster.approve": { km: "អនុម័តការជំនួស/ដូរវេន", en: "Approved a cover/swap" },
  "roster.refuse": { km: "បដិសេធការជំនួស/ដូរវេន", en: "Refused a cover/swap" },
  "roster.dayoff": { km: "ប្តូរថ្ងៃឈប់/ថ្ងៃធ្វើការ", en: "Changed a day off" },
  "staff.create": { km: "បង្កើតគណនីបុគ្គលិក", en: "Created a staff account" },
  "staff.update": { km: "កែព័ត៌មានបុគ្គលិក", en: "Edited a staff member" },
  "staff.password": { km: "កំណត់ពាក្យសម្ងាត់ថ្មី", en: "Reset a password" },
  "staff.account": { km: "បិទ/បើក/លុបគណនី", en: "Turned an account off/on/removed" },
  "pay.adjust": { km: "បន្ថែម/កាត់ប្រាក់ខែ", en: "Pay bonus/deduction" },
  "pay.adjust.remove": { km: "លុបការបន្ថែម/កាត់ប្រាក់", en: "Removed a pay adjustment" },
  "pay.paid": { km: "សម្គាល់ថាបានបើកប្រាក់ខែ", en: "Marked pay as paid" },
  "pay.unpaid": { km: "ដកការបើកប្រាក់ខែវិញ", en: "Undid paid pay" },
  "position.save": { km: "កែតួនាទី និងអត្រាប្រាក់", en: "Saved a position" },
  "position.delete": { km: "លុបតួនាទី", en: "Deleted a position" },
  "leave.decide": { km: "សម្រេចច្បាប់ឈប់", en: "Decided a leave request" },
  "cash.review": { km: "ពិនិត្យការបិទបញ្ជីប្រាក់", en: "Reviewed a cash close" },
  "report.export": { km: "ទាញរបាយការណ៍ចេញ", en: "Downloaded a report" },
  "settings.staff": { km: "ប្តូរការកំណត់បុគ្គលិក", en: "Changed staff settings" },
  "settings.payment": { km: "ប្តូរការកំណត់ Bakong", en: "Changed Bakong settings" },
  "settings.telegram": { km: "ប្តូរការកំណត់ Telegram", en: "Changed Telegram settings" },
  "settings.tts": { km: "ប្តូរការកំណត់សំឡេង", en: "Changed voice settings" },
  "settings.shop_payment": { km: "ប្តូរ KHQR ហាងអនុស្សាវរីយ៍", en: "Changed the shop KHQR" },
  "settings.turn": { km: "ប្តូរការកំណត់ការហៅ (TURN)", en: "Changed call settings (TURN)" },
  "shop.product": { km: "កែទំនិញក្នុងហាង", en: "Edited a shop product" },
  "shop.stock": { km: "កែស្តុកទំនិញ", en: "Changed shop stock" },
  "shop.cancel": { km: "បោះបង់ការលក់", en: "Cancelled a sale" },
  "live.remove": { km: "លុបការផ្សាយផ្ទាល់", en: "Removed a live video" },
};
const GROUPS = [
  { key: "roster", km: "កាលវិភាគ", en: "Schedule", Icon: CalendarRange },
  { key: "staff", km: "គណនី", en: "Accounts", Icon: Users },
  { key: "pay", km: "ប្រាក់ខែ", en: "Pay", Icon: Wallet },
  { key: "cash", km: "បិទបញ្ជី", en: "Cash", Icon: Banknote },
  { key: "settings", km: "ការកំណត់", en: "Settings", Icon: Settings2 },
] as const;

/** Admin: who changed the schedule, pay, accounts and settings, and when. */
export default async function ActivityPage({ searchParams }: { searchParams: { g?: string } }) {
  const km = getI18n().locale === "km";
  const g = GROUPS.find((x) => x.key === searchParams.g)?.key ?? null;
  const db = createServiceRoleClient();
  let q = db.from("audit_logs").select("id, actor_id, action, entity_table, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(300);
  if (g) q = q.or(g === "pay" ? "action.like.pay.%,action.like.position.%,action.eq.leave.decide" : `action.like.${g}.%`);
  const { data: rows } = await q;
  const ids = [...new Set((rows ?? []).flatMap((r: any) => [r.actor_id, r.entity_id]).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: staff }] = ids.length
    ? await Promise.all([db.from("profiles").select("id, full_name").in("id", ids), db.from("staff_members").select("user_id, full_name, staff_no").in("user_id", ids)])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const name = (id?: string | null) => {
    if (!id) return null;
    const s = (staff ?? []).find((x: any) => x.user_id === id);
    if (s) return `${s.full_name} (${s.staff_no})`;
    return (profiles ?? []).find((x: any) => x.id === id)?.full_name ?? null;
  };
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const detail = (r: any) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    const target = r.entity_table === "staff_members" || r.entity_table === "staff_payslips" || r.entity_table === "staff_pay_adjustments" ? name(r.entity_id) : null;
    const bits = [
      target,
      m.status && `→ ${m.status}`,
      m.decision && `→ ${m.decision}`,
      m.month && `${m.month}`,
      m.amount && `$${m.amount}`,
      m.note && `«${m.note}»`,
      m.weekStart && `${km ? "សប្តាហ៍" : "week"} ${m.weekStart}`,
      m.day && `${m.day}`,
      m.boxes && `${m.boxes} ${km ? "ប្រអប់" : "boxes"}`,
      m.name && `${m.name}`,
      m.type && `${m.type}`,
    ].filter(Boolean);
    return bits.join(" · ");
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <AdminPageHeader icon={History} title={km ? "ប្រវត្តិការកែប្រែ" : "Activity log"} subtitle={km ? "អ្នកណាកែកាលវិភាគ ប្រាក់ខែ គណនីបុគ្គលិក ឬការកំណត់ ហើយនៅពេលណា (៣០០ ចុងក្រោយ)។" : "Who changed the schedule, pay, staff accounts or settings, and when (last 300)."} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/activity" className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", !g ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10")}>{km ? "ទាំងអស់" : "All"}</Link>
        {GROUPS.map((x) => (
          <Link key={x.key} href={`/admin/activity?g=${x.key}`} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold", g === x.key ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-black/10")}>
            <x.Icon size={14} /> {km ? x.km : x.en}
          </Link>
        ))}
      </div>
      {!rows?.length ? (
        <p className="card p-8 text-center text-ink/55">{km ? "មិនទាន់មានការកែប្រែណាមួយត្រូវបានកត់ត្រាទេ។ ការកែប្រែចាប់ពីពេលនេះនឹងបង្ហាញនៅទីនេះ។" : "Nothing recorded yet. Changes from now on appear here."}</p>
      ) : (
        <ul className="card divide-y divide-black/5 overflow-hidden p-0">
          {rows.map((r: any) => {
            const w = WHAT[r.action];
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="w-28 flex-shrink-0 text-xs font-semibold tabular-nums text-ink/50">{when(r.created_at)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-forest">{w ? (km ? w.km : w.en) : r.action}</p>
                  {detail(r) && <p className="truncate text-xs text-ink/60">{detail(r)}</p>}
                </div>
                <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-ink/70">{name(r.actor_id) ?? (km ? "ប្រព័ន្ធ" : "System")}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
