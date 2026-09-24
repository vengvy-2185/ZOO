import Link from "next/link";
import { Tags, Pencil, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { categoryTheme } from "@/lib/utils/category";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";

export default async function AdminCategoriesPage({ searchParams }: { searchParams: { saved?: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const [{ data: categories }, { data: animals }] = await Promise.all([
    supabase.from("animal_categories").select("*").order("sort_order"),
    supabase.from("animals").select("category_id"),
  ]);
  const counts = new Map<string, number>();
  (animals ?? []).forEach((a) => counts.set(a.category_id, (counts.get(a.category_id) ?? 0) + 1));
  const c = t.admin.categories;

  return (
    <div className="p-8">
      <AdminPageHeader icon={Tags} title={c.title} subtitle={c.subtitle} />

      {searchParams.saved && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-soft">
          <CheckCircle2 size={18} className="text-leaf" /> {t.admin.saved}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(categories ?? []).map((cat) => {
          const theme = categoryTheme(cat.slug);
          const Icon = getCategoryIcon(cat.slug);
          const primaryName = (locale === "km" && cat.khmer_name) || cat.name;
          const secondaryName = locale === "km" ? cat.name : cat.khmer_name;
          const description = (locale === "km" && cat.description_km) || cat.description;
          return (
            <Link
              key={cat.id}
              href={`/admin/categories/${cat.id}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/[0.04] transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] overflow-hidden" style={{ background: theme.gradient }}>
                {cat.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <span className="flex h-full items-center justify-center" style={{ color: theme.solid }}>
                    <Icon size={56} strokeWidth={1.5} />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-forest/80 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-soft" style={{ color: theme.solid }}>
                  <Icon size={20} />
                </span>
                <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-forest shadow-soft">
                  {c.count(num(counts.get(cat.id) ?? 0, locale))}
                </span>
                <span className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="block font-display text-2xl font-extrabold leading-tight">{primaryName}</span>
                  {secondaryName && <span className="text-sm text-white/80">{secondaryName}</span>}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 p-4">
                <p className="line-clamp-2 text-sm text-ink/60">{description ?? "—"}</p>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <StatusBadge active={cat.is_active} label={cat.is_active ? t.common.active : t.common.inactive} />
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition group-hover:opacity-100">
                    <Pencil size={12} /> {t.admin.edit}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
