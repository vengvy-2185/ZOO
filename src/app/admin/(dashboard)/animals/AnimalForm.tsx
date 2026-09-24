import { IdCard, Tags, CalendarDays, ImageIcon, BookOpen } from "lucide-react";
import { FormSection, Field, SelectField, BilingualField } from "@/components/admin/ui";
import { ImageUploadField, SubmitButton } from "@/components/admin/ui-client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";

// One form for both "Add Animal" and "Edit Animal". Every visitor-facing
// text field has an English and a Khmer input side by side.
export function AnimalForm({
  action,
  animal,
  categories,
  species,
  t,
  locale,
}: {
  action: (formData: FormData) => Promise<void>;
  animal?: Record<string, any> | null;
  categories: { id: string; name: string; khmer_name: string | null }[];
  species: { id: string; common_name: string; khmer_name: string | null }[];
  t: Dictionary;
  locale: Locale;
}) {
  const f = t.admin.form;
  const a = animal ?? {};
  const label = (en: string, km: string | null) => (locale === "km" && km ? km : en);

  return (
    <form action={action} className="space-y-5">
      <FormSection icon={IdCard} title={f.basics}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.name} name="name" defaultValue={a.name} required placeholder="KOMA" />
          <Field label={f.khmerName} name="khmer_name" defaultValue={a.khmer_name} lang="km" className="font-khmer" placeholder="កូម៉ា" />
          <Field label={f.code} name="animal_code" defaultValue={a.animal_code} required placeholder="LION-A-002" hint={f.codeHint} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label={f.gender} name="gender" defaultValue={a.gender ?? "unknown"}>
              <option value="unknown">{f.unknown}</option>
              <option value="male">{t.common.male}</option>
              <option value="female">{t.common.female}</option>
            </SelectField>
            <SelectField label={f.status} name="status" defaultValue={a.status ?? "active"}>
              {Object.entries(f.statuses).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      </FormSection>

      <FormSection icon={Tags} title={`${f.category} & ${f.species}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label={f.category} name="category_id" defaultValue={a.category_id ?? ""} required>
            <option value="">{f.selectCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c.name, c.khmer_name)}
              </option>
            ))}
          </SelectField>
          <SelectField label={f.species} name="species_id" defaultValue={a.species_id ?? ""} required>
            <option value="">{f.selectSpecies}</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s.common_name, s.khmer_name)}
              </option>
            ))}
          </SelectField>
        </div>
      </FormSection>

      <FormSection icon={CalendarDays} title={f.dates}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={f.dob} name="date_of_birth" type="date" defaultValue={a.date_of_birth ?? ""} />
          <Field label={f.arrival} name="arrival_date" type="date" defaultValue={a.arrival_date ?? ""} />
        </div>
        <BilingualField label={f.placeOfBirth} name="place_of_birth" en={a.place_of_birth} km={a.place_of_birth_km} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
      </FormSection>

      <FormSection icon={ImageIcon} title={f.photo} hint={f.photoHint}>
        <ImageUploadField name="main_image_url" label={f.photo} current={a.main_image_url} uploadLabel={f.upload} urlLabel={f.orUrl} />
      </FormSection>

      <FormSection icon={BookOpen} title={f.profile} hint={f.profileHint}>
        <BilingualField label={f.biography} name="biography" en={a.biography} km={a.biography_km} multiline rows={5} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        <BilingualField label={f.personality} name="personality" en={a.personality} km={a.personality_km} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        <BilingualField label={f.favoriteFood} name="favorite_food" en={a.favorite_food} km={a.favorite_food_km} multiline rows={2} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        <BilingualField label={f.favoriteActivities} name="favorite_activities" en={a.favorite_activities} km={a.favorite_activities_km} multiline rows={2} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        <BilingualField label={f.care} name="care_information" en={a.care_information} km={a.care_information_km} multiline rows={3} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
        <BilingualField label={f.facts} name="interesting_facts" en={a.interesting_facts} km={a.interesting_facts_km} multiline rows={3} enLabel={t.admin.english} kmLabel={t.admin.khmer} />
      </FormSection>

      <div className="sticky bottom-3 z-20 flex justify-end">
        <SubmitButton label={animal ? t.admin.save : f.saveAnimal} pendingLabel={t.admin.saving} className="shadow-lift" />
      </div>
    </form>
  );
}
