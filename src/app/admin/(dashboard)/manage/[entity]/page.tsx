import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil, CheckCircle2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, AdminTable, StatusBadge, Thumb } from "@/components/admin/ui";
import { getEntity, REF_LABELS } from "@/lib/admin/entities";
import { getI18n } from "@/lib/i18n/server";
import { toggleEntityField } from "../actions";

export const dynamic = "force-dynamic";

export default async function ManageListPage({
  params,
  searchParams,
}: {
  params: { entity: string };
  searchParams: { saved?: string; deleted?: string; parent?: string };
}) {
  const entity = getEntity(params.entity);
  if (!entity) notFound();
  const { locale } = getI18n();
  const km = locale === "km";
  const L = (l: { en: string; km: string }) => (km ? l.km : l.en);
  const supabase = createClient();

  let query = supabase.from(entity.table).select("*").order(entity.order.column, { ascending: entity.order.ascending ?? true });
  const parent = searchParams.parent && /^[0-9a-f-]{36}$/i.test(searchParams.parent) ? searchParams.parent : null;
  if (entity.parent && parent) query = query.eq(entity.parent.column, parent);
  const { data: rows } = await query;

  // Resolve foreign-key columns to readable names.
  const refCols = entity.columns.filter((c) => c.ref);
  const refMaps = Object.fromEntries(
    await Promise.all(
      refCols.map(async (c) => {
        const r = REF_LABELS[c.ref!];
        const { data } = await supabase.from(r.table).select(`id, ${r.label}${r.labelKm ? `, ${r.labelKm}` : ""}`);
        const map = new Map<string, string>(((data ?? []) as any[]).map((d) => [d.id, (km && r.labelKm && d[r.labelKm]) || d[r.label]]));
        return [c.name, map] as const;
      })
    )
  );

  const cell = (row: any, c: (typeof entity.columns)[number]) => {
    const v = row[c.name];
    if (c.ref) return refMaps[c.name]?.get(v) ?? "—";
    if (typeof v === "boolean") {
      const badge = <StatusBadge active={v} label={v ? (km ? "បាទ/ចាស" : "Yes") : km ? "ទេ" : "No"} />;
      // yes/no fields on the form can be flipped right here with one tap
      if (!entity.fields.some((f) => f.name === c.name && f.type === "bool")) return badge;
      return (
        <form action={toggleEntityField.bind(null, params.entity, row.id, c.name)}>
          <button title={km ? "ចុចដើម្បីប្តូរ" : "Tap to change"} className="rounded-full transition hover:scale-105 hover:ring-2 hover:ring-primary/30">{badge}</button>
        </form>
      );
    }
    if (c.name === "color" && v) return <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: v }} />{v}</span>;
    if (c.name === "price_usd") return `$${Number(v).toFixed(2)}`;
    if (typeof v === "string" && v.length > 90) return <span title={v}>{v.slice(0, 90)}…</span>;
    return v ?? "—";
  };

  const newHref = `/admin/manage/${params.entity}/new${parent ? `?parent=${parent}` : ""}`;

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={entity.icon}
        title={L(entity.title)}
        subtitle={L(entity.subtitle)}
        actions={
          entity.noCreate ? undefined : (
            <Link href={newHref} className="btn-primary">
              <Plus size={16} /> {km ? "បន្ថែមថ្មី" : "Add new"}
            </Link>
          )
        }
      />
      {(searchParams.saved || searchParams.deleted) && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white">
          <CheckCircle2 size={18} className="text-leaf" /> {searchParams.deleted ? (km ? "បានលុប" : "Deleted") : km ? "បានរក្សាទុក" : "Saved"} ✓
        </p>
      )}
      <AdminTable
        head={[...(entity.image ? [""] : []), km ? "ឈ្មោះ" : "Name", ...entity.columns.map((c) => L(c.label)), ""]}
        empty={(rows ?? []).length === 0 && (km ? "មិនទាន់មានទិន្នន័យ" : "Nothing here yet")}
      >
        {((rows ?? []) as any[]).map((row) => {
          const title = (km && entity.titleKm && row[entity.titleKm]) || row[entity.titleField] || "—";
          const sub = entity.titleKm ? (km ? row[entity.titleField] : row[entity.titleKm]) : null;
          const href = `/admin/manage/${params.entity}/${row.id}`;
          return (
            <tr key={row.id} className="transition hover:bg-light-green/40">
              {entity.image && (
                <td className="px-4 py-2.5">
                  <Thumb src={row[entity.image]} className="h-11 w-14" />
                </td>
              )}
              <td className="px-4 py-2.5">
                <Link href={href} className="font-display text-base font-bold text-forest hover:text-primary">
                  {title}
                </Link>
                {sub && sub !== title && <div className="text-[11px] text-ink/45">{sub}</div>}
              </td>
              {entity.columns.map((c) => (
                <td key={c.name} className="px-4 py-2.5 text-ink/70">
                  {cell(row, c)}
                </td>
              ))}
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-1.5">
                  {params.entity === "stories" && (
                    <Link href={`/admin/manage/story_pages?parent=${row.id}`} className="inline-flex items-center gap-1 rounded-xl bg-cream px-3 py-1.5 text-xs font-bold text-forest hover:bg-light-green">
                      <FileText size={13} /> {km ? "ទំព័រ" : "Pages"}
                    </Link>
                  )}
                  <Link href={href} className="inline-flex items-center gap-1 rounded-xl bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                    <Pencil size={13} /> {km ? "កែប្រែ" : "Edit"}
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
