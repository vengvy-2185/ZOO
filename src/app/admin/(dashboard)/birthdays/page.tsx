import Link from "next/link";
import { Cake, PartyPopper, CalendarRange, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, Thumb } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";

export default async function AdminBirthdaysPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const [{ data: upcoming }, { data: animals }] = await Promise.all([
    supabase.rpc("get_upcoming_birthdays", { p_days: 30 }),
    supabase.from("animals").select("id, khmer_name, main_image_url"),
  ]);
  const extra = new Map((animals ?? []).map((a) => [a.id, a]));
  const list = (upcoming ?? []) as any[];
  const b = t.admin.birthdaysPage;
  const groups = [
    [PartyPopper, b.today, list.filter((x) => x.days_away === 0)],
    [CalendarRange, b.week, list.filter((x) => x.days_away > 0 && x.days_away <= 7)],
    [CalendarDays, b.upcoming, list.filter((x) => x.days_away > 7)],
  ] as const;

  return (
    <div className="p-8">
      <AdminPageHeader icon={Cake} title={b.title} subtitle={b.subtitle} />
      <div className="space-y-8">
        {groups.map(([Icon, title, items]) => (
          <section key={title}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-forest">
              <Icon size={20} className="text-primary" /> {title}
            </h2>
            {items.length === 0 ? (
              <p className="rounded-2xl bg-cream p-4 text-sm text-ink/50">{b.none}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((x: any) => {
                  const e = extra.get(x.animal_id);
                  return (
                    <Link key={x.animal_id} href={`/admin/animals/${x.animal_id}`} className="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5">
                      <Thumb src={e?.main_image_url} className="h-14 w-14 flex-shrink-0 rounded-2xl" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-forest">{(locale === "km" && e?.khmer_name) || x.name}</div>
                        <div className="text-[11px] text-ink/45">{x.animal_code}</div>
                        <div className="text-xs font-bold text-primary">{x.days_away === 0 ? b.todayBang : b.inDays(num(x.days_away, locale))}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
