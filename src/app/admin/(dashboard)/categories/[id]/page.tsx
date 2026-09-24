import { notFound } from "next/navigation";
import { Tags, IdCard, ImageIcon, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, FormSection, Field, BilingualField } from "@/components/admin/ui";
import { ImageUploadField, SubmitButton } from "@/components/admin/ui-client";
import { getI18n } from "@/lib/i18n/server";
import { updateCategory } from "../actions";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const { data: cat } = await supabase.from("animal_categories").select("*").eq("id", params.id).single();
  if (!cat) notFound();
  const c = t.admin.categories;
  const f = t.admin.form;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <AdminPageHeader
        icon={Tags}
        title={`${c.editTitle}: ${(locale === "km" && cat.khmer_name) || cat.name}`}
        back={{ href: "/admin/categories", label: c.title }}
      />
      <form action={updateCategory.bind(null, cat.id)} className="space-y-5">
        <FormSection icon={IdCard} title={f.basics}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.admin.name} name="name" defaultValue={cat.name} required />
            <Field label={t.admin.nameKm} name="khmer_name" defaultValue={cat.khmer_name ?? ""} lang="km" />
            <Field label={c.icon} name="icon" defaultValue={cat.icon ?? ""} placeholder="🦁" />
            <Field label={c.sortOrder} name="sort_order" type="number" defaultValue={cat.sort_order ?? 0} />
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
            <input type="checkbox" name="is_active" defaultChecked={cat.is_active} className="h-5 w-5 accent-[#176B3A]" />
            {c.activeLabel}
          </label>
        </FormSection>

        <FormSection icon={ImageIcon} title={f.photo} hint={f.photoHint}>
          <ImageUploadField name="image_url" label={f.photo} current={cat.image_url} uploadLabel={f.upload} urlLabel={f.orUrl} aspect="aspect-[16/10]" />
        </FormSection>

        <FormSection icon={FileText} title={c.description}>
          <BilingualField label={c.description} name="description" en={cat.description} km={cat.description_km} multiline rows={3} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        </FormSection>

        <div className="flex justify-end">
          <SubmitButton label={t.admin.save} pendingLabel={t.admin.saving} />
        </div>
      </form>
    </div>
  );
}
