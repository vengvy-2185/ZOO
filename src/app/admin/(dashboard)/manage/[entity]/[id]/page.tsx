import { notFound } from "next/navigation";
import { Pencil, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, FormSection, Field, SelectField, BilingualField } from "@/components/admin/ui";
import { SubmitButton, ImageUploadField, ConfirmDeleteButton, CodeField } from "@/components/admin/ui-client";
import { getEntity, type FieldDef } from "@/lib/admin/entities";
import { getI18n } from "@/lib/i18n/server";
import { saveEntity, deleteEntity } from "../../actions";

export const dynamic = "force-dynamic";

const textareaCls =
  "w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm leading-relaxed text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export default async function ManageEditPage({
  params,
  searchParams,
}: {
  params: { entity: string; id: string };
  searchParams: { parent?: string; error?: string };
}) {
  const entity = getEntity(params.entity);
  if (!entity) notFound();
  const isNew = params.id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { locale } = getI18n();
  const km = locale === "km";
  const L = (l: { en: string; km: string }) => (km ? l.km : l.en);
  const supabase = createClient();

  const row: Record<string, any> = isNew
    ? { is_active: true, is_published: true, ...(entity.parent && searchParams.parent ? { [entity.parent.column]: searchParams.parent } : {}) }
    : ((await supabase.from(entity.table).select("*").eq("id", params.id).maybeSingle()).data as any);
  if (!row) notFound();

  // Options for every foreign-key dropdown.
  const refOptions = Object.fromEntries(
    await Promise.all(
      entity.fields
        .filter((f) => f.type === "ref")
        .map(async (f) => {
          const r = f.ref!;
          const { data } = await supabase
            .from(r.table)
            .select(`id, ${r.label}${r.labelKm ? `, ${r.labelKm}` : ""}`)
            .order(r.order ?? r.label);
          return [f.name, ((data ?? []) as any[]).map((d) => ({ id: d.id as string, label: ((km && r.labelKm && d[r.labelKm]) || d[r.label]) as string }))] as const;
        })
    )
  );

  const title = isNew ? (km ? "បន្ថែមថ្មី" : "Add new") : (km && entity.titleKm && row[entity.titleKm]) || row[entity.titleField] || L(entity.title);
  const parentQs = entity.parent && row[entity.parent.column] ? `?parent=${row[entity.parent.column]}` : "";

  const input = (f: FieldDef) => {
    const label = L(f.label);
    const hint = f.hint ? L(f.hint) : undefined;
    const v = row[f.name];
    if (f.km) {
      return <BilingualField label={label + (f.required ? " *" : "")} name={f.name} en={v} km={row[f.km]} multiline={f.type === "textarea"} rows={f.name === "content" ? 6 : 3} />;
    }
    switch (f.type) {
      case "textarea":
        return (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</span>
            <textarea name={f.name} defaultValue={v ?? ""} rows={5} className={textareaCls} />
            {hint && <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>}
          </label>
        );
      case "bool":
        return (
          <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
            <input type="checkbox" name={f.name} defaultChecked={!!v} className="h-5 w-5 accent-[#176B3A]" /> {label}
          </label>
        );
      case "select":
        return (
          <SelectField label={label} name={f.name} defaultValue={v ?? ""} required={f.required}>
            {!f.required && <option value="">—</option>}
            {f.options!.map((o) => (
              <option key={o} value={o}>
                {f.optionLabels?.[o] ? L(f.optionLabels[o]) : o.replace(/_/g, " ")}
              </option>
            ))}
          </SelectField>
        );
      case "ref":
        return (
          <SelectField label={label} name={f.name} defaultValue={v ?? ""} required={f.required}>
            <option value="">{km ? "— ជ្រើសរើស —" : "— choose —"}</option>
            {(refOptions[f.name] ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </SelectField>
        );
      case "image":
        return <ImageUploadField name={f.name} label={label} hint={hint} transparent={f.transparent} aspect={f.transparent ? "aspect-square" : undefined} current={v} uploadLabel={km ? "ផ្ទុករូបឡើង" : "Upload photo"} urlLabel={km ? "ឬបិទភ្ជាប់តំណរូប" : "…or paste an image URL"} />;
      case "color":
        return (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</span>
            <input type="color" name={f.name} defaultValue={v ?? "#176B3A"} className="h-11 w-full cursor-pointer rounded-2xl border border-black/10 bg-white p-1" />
          </label>
        );
      case "date":
        return <Field label={label} name={f.name} type="date" defaultValue={v ?? ""} required={f.required} hint={hint} />;
      case "code":
        return <CodeField name={f.name} label={label} hint={hint} defaultValue={v ?? ""} generateLabel={km ? "បង្កើតកូដ" : "Generate"} />;
      case "number":
        return <Field label={label} name={f.name} type="number" step="any" defaultValue={v ?? ""} required={f.required} hint={hint} />;
      default:
        return <Field label={label} name={f.name} defaultValue={v ?? ""} required={f.required} hint={hint} />;
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <AdminPageHeader
        icon={entity.icon}
        title={title}
        subtitle={L(entity.title)}
        back={{ href: entity.listHref ?? `/admin/manage/${params.entity}${parentQs}`, label: km ? "ត្រឡប់ក្រោយ" : "Back" }}
      />
      {searchParams.error === "in-use" && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          <AlertTriangle size={18} />
          {km ? "មិនអាចលុបបានទេ ព្រោះនៅមានទិន្នន័យផ្សេងកំពុងប្រើវា (ឧ. សត្វ ឬទ្រុង)។" : "Can't delete — other items still use this one (e.g. animals or enclosures). Move or delete those first."}
        </p>
      )}
      <form action={saveEntity.bind(null, params.entity, params.id)}>
        <FormSection icon={Pencil} title={km ? "ព័ត៌មាន" : "Details"} hint={km ? "វាលដែលមាន * គឺត្រូវតែបំពេញ។ ប្រអប់ខ្មែរ​ ប្រសិនបើទុកទទេ នឹងបង្ហាញជាភាសាអង់គ្លេស។" : "Fields marked * are required. Leave a Khmer box empty to fall back to English."}>
          <div className="grid gap-4 md:grid-cols-2">
            {entity.fields.map((f) => (
              <div key={f.name} className={f.wide || f.km ? "md:col-span-2" : undefined}>
                {input(f)}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <SubmitButton label={km ? "រក្សាទុក" : "Save"} pendingLabel={km ? "កំពុងរក្សាទុក…" : "Saving…"} />
          </div>
        </FormSection>
      </form>
      {!isNew && (
        <form action={deleteEntity.bind(null, params.entity, params.id)} className="mt-4 flex justify-end">
          <ConfirmDeleteButton label={km ? "លុប" : "Delete"} confirmLabel={km ? "ចុចម្តងទៀតដើម្បីលុប" : "Tap again to delete"} />
        </form>
      )}
    </div>
  );
}
