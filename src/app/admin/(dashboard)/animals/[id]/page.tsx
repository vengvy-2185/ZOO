import { notFound } from "next/navigation";
import Link from "next/link";
import { PawPrint, QrCode, Download, ExternalLink, Images, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateQrDataUrl, animalQrUrl } from "@/lib/utils/qr";
import { getSiteUrl } from "@/lib/server/site-url";
import { QrSignDownload } from "@/components/admin/QrSignDownload";
import { AdminPageHeader, FormSection, BilingualField, Thumb } from "@/components/admin/ui";
import { ImageUploadField, SubmitButton } from "@/components/admin/ui-client";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";
import { AnimalForm } from "../AnimalForm";
import { updateAnimal, addAnimalPhoto, deleteAnimalPhoto } from "../actions";

export default async function EditAnimalPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const f = t.admin.form;

  const { data: animal } = await supabase.from("animals").select("*").eq("id", params.id).single();
  if (!animal) notFound();

  const [{ data: qr }, { data: photos }, { data: categories }, { data: species }] = await Promise.all([
    supabase.from("animal_qr_codes").select("*").eq("animal_id", animal.id).maybeSingle(),
    supabase.from("animal_photos").select("*").eq("animal_id", animal.id).order("sort_order"),
    supabase.from("animal_categories").select("id, name, khmer_name").order("sort_order"),
    supabase.from("species").select("id, common_name, khmer_name").order("common_name"),
  ]);
  const siteUrl = getSiteUrl();
  // Printed beside the enclosure: holds the secret token that proves a real visit (Animal Quest).
  const qrDataUrl = qr?.qr_token ? await generateQrDataUrl(animalQrUrl(siteUrl, qr.qr_token)) : null;
  const displayName = (locale === "km" && animal.khmer_name) || animal.name;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <AdminPageHeader
        icon={PawPrint}
        title={displayName}
        subtitle={f.editSubtitle}
        back={{ href: "/admin/animals", label: t.admin.items.animals }}
        actions={
          <Link href={`/animals/${animal.animal_code}`} target="_blank" className="btn-outline px-4 py-2">
            <ExternalLink size={15} /> {f.viewPublic}
          </Link>
        }
      />

      {searchParams.saved && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-soft">
          <CheckCircle2 size={18} className="text-leaf" /> {t.admin.saved}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <AnimalForm action={updateAnimal.bind(null, animal.id)} animal={animal} categories={categories ?? []} species={species ?? []} t={t} locale={locale} />

        <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <div className="card overflow-hidden">
            <Thumb src={animal.main_image_url} className="aspect-[4/3] w-full rounded-none" />
            <div className="p-4">
              <div className="font-display text-xl font-bold text-forest">{displayName}</div>
              <div className="text-xs text-ink/50">{animal.animal_code}</div>
            </div>
          </div>

          <div className="card p-5 text-center">
            <h2 className="flex items-center justify-center gap-2 font-display text-lg font-bold text-forest">
              <QrCode size={18} className="text-primary" /> {f.qr}
            </h2>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR" className="mx-auto mt-3 h-44 w-44 rounded-2xl ring-1 ring-black/5" />
            )}
            <p className="mt-2 text-xs font-semibold text-ink/50">{f.scans(num(qr?.scan_count ?? 0, locale))}</p>
            {qrDataUrl && (
              <a href={qrDataUrl} download={`${animal.animal_code}-qr.png`} className="btn-outline mt-3 w-full py-2 text-xs">
                <Download size={14} /> {f.downloadQr}
              </a>
            )}
            {qr?.qr_token && (
              <QrSignDownload
                url={animalQrUrl(siteUrl, qr.qr_token)}
                code={animal.animal_code}
                name={animal.name}
                nameKm={animal.khmer_name}
                species={(species ?? []).find((x: any) => x.id === animal.species_id)?.common_name ?? null}
                speciesKm={(species ?? []).find((x: any) => x.id === animal.species_id)?.khmer_name ?? null}
                image={animal.main_image_url}
                label={locale === "km" ? "ទាញយកផ្លាកសម្រាប់បោះពុម្ព" : "Download printable sign"}
                className="btn-primary mt-2 w-full py-2 text-xs"
              />
            )}
          </div>
        </aside>
      </div>

      {/* Gallery */}
      <div className="mt-6">
        <FormSection icon={Images} title={f.gallery} hint={f.galleryHint}>
          {(photos ?? []).length === 0 ? (
            <p className="rounded-2xl bg-cream p-4 text-sm text-ink/50">{f.noPhotos}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {(photos ?? []).map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-2xl ring-1 ring-black/5">
                  <Thumb src={p.image_url} className="aspect-[4/3] w-full rounded-none" />
                  <div className="p-2 text-[11px] leading-snug text-ink/60">{(locale === "km" && p.caption_km) || p.caption || "—"}</div>
                  <form action={deleteAnimalPhoto.bind(null, animal.id, p.id)} className="absolute right-2 top-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-soft transition hover:bg-red-600 hover:text-white" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addAnimalPhoto.bind(null, animal.id)} className="space-y-4 rounded-2xl border-2 border-dashed border-primary/15 p-4">
            <ImageUploadField name="photo" label={f.addPhoto} uploadLabel={f.upload} urlLabel={f.orUrl} hint={f.photoHint} />
            <BilingualField label={f.caption} name="caption" enLabel={t.admin.english} kmLabel={t.admin.khmer} />
            <div className="flex justify-end">
              <SubmitButton label={f.addPhoto} pendingLabel={t.admin.saving} />
            </div>
          </form>
        </FormSection>
      </div>
    </div>
  );
}
