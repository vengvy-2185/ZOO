import Link from "next/link";
import { PawPrint, Plus, Search, Pencil, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/utils/age";
import { AdminPageHeader, AdminTable, StatusBadge, Thumb } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminAnimalsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  let query = supabase
    .from("animals")
    .select("*, species:species_id(common_name, khmer_name), category:category_id(name, khmer_name)")
    .order("name");
  if (searchParams.q) {
    const term = searchParams.q.replace(/[,()*%\\]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,khmer_name.ilike.%${term}%,animal_code.ilike.%${term}%`);
  }
  const { data: animals } = await query;
  const a = t.admin.animals;
  const km = (en?: string | null, k?: string | null) => (locale === "km" && k) || en || "—";

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={PawPrint}
        title={a.title}
        subtitle={a.subtitle}
        actions={
          <Link href="/admin/animals/new" className="btn-primary px-5 py-2.5">
            <Plus size={16} /> {t.admin.addAnimal}
          </Link>
        }
      />

      <form className="mb-5" action="/admin/animals">
        <div className="relative max-w-md">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input name="q" defaultValue={searchParams.q} placeholder={t.admin.search} className="input pl-11" />
        </div>
      </form>

      <AdminTable
        head={[a.photo, t.admin.name, a.species, a.gender, a.age, t.admin.status, t.admin.actions]}
        empty={(animals ?? []).length === 0 && a.none}
      >
        {(animals ?? []).map((row: any) => (
          <tr key={row.id} className="transition hover:bg-light-green/40">
            <td className="px-4 py-2.5">
              <Thumb src={row.main_image_url} className="h-12 w-16" />
            </td>
            <td className="px-4 py-2.5">
              <Link href={`/admin/animals/${row.id}`} className="font-display text-base font-bold text-forest hover:text-primary">
                {km(row.name, row.khmer_name)}
              </Link>
              <div className="text-[11px] text-ink/45">{row.animal_code}</div>
            </td>
            <td className="px-4 py-2.5 text-ink/70">
              {km(row.species?.common_name, row.species?.khmer_name)}
              <div className="text-[11px] text-ink/40">{km(row.category?.name, row.category?.khmer_name)}</div>
            </td>
            <td className="px-4 py-2.5 text-ink/70">
              {row.gender === "male" ? `♂ ${t.common.male}` : row.gender === "female" ? `♀ ${t.common.female}` : "—"}
            </td>
            <td className="px-4 py-2.5 text-ink/70">{calculateAge(row.date_of_birth, locale) ?? "—"}</td>
            <td className="px-4 py-2.5">
              <StatusBadge active={row.status === "active"} label={t.admin.form.statuses[row.status] ?? row.status} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex gap-1.5">
                <Link href={`/admin/animals/${row.id}`} className="flex h-9 items-center gap-1.5 rounded-full bg-light-green px-3 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                  <Pencil size={13} /> {t.admin.edit}
                </Link>
                <Link href={`/animals/${row.animal_code}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/10 text-ink/50 hover:text-primary" aria-label={t.admin.view}>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
