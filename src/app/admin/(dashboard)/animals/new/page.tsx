import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { AnimalForm } from "../AnimalForm";
import { createAnimal } from "../actions";

export default async function NewAnimalPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const [{ data: categories }, { data: species }] = await Promise.all([
    supabase.from("animal_categories").select("id, name, khmer_name").order("sort_order"),
    supabase.from("species").select("id, common_name, khmer_name").order("common_name"),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <AdminPageHeader
        icon={PlusCircle}
        title={t.admin.form.newTitle}
        subtitle={t.admin.form.newSubtitle}
        back={{ href: "/admin/animals", label: t.admin.items.animals }}
      />
      <AnimalForm action={createAnimal} categories={categories ?? []} species={species ?? []} t={t} locale={locale} />
    </div>
  );
}
