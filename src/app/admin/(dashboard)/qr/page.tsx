import Link from "next/link";
import { QrCode, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { generateQrDataUrl, animalQrUrl } from "@/lib/utils/qr";
import { getSiteUrl } from "@/lib/server/site-url";
import { QrSignDownload } from "@/components/admin/QrSignDownload";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";

export default async function AdminQrPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const { data: qrs } = await supabase
    .from("animal_qr_codes")
    .select("*, animals(id, name, khmer_name, animal_code, main_image_url, species:species_id(common_name, khmer_name))")
    .order("scan_count", { ascending: false });
  const siteUrl = getSiteUrl();
  const rows = await Promise.all(
    (qrs ?? []).map(async (q: any) => ({ ...q, url: animalQrUrl(siteUrl, q.qr_token), img: q.animals ? await generateQrDataUrl(animalQrUrl(siteUrl, q.qr_token)) : null }))
  );
  const p = t.admin.qrPage;

  return (
    <div className="p-8">
      <AdminPageHeader icon={QrCode} title={p.title} subtitle={p.subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((q) => (
          <div key={q.id} className="card p-4 text-center">
            {q.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.img} alt="" className="mx-auto h-36 w-36 rounded-2xl ring-1 ring-black/5" />
            )}
            <Link href={`/admin/animals/${q.animals?.id}`} className="mt-2 block font-display text-lg font-bold text-forest hover:text-primary">
              {(locale === "km" && q.animals?.khmer_name) || q.animals?.name}
            </Link>
            <div className="text-[11px] text-ink/45">{q.animals?.animal_code}</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-light-green px-2.5 py-1 text-xs font-bold text-primary">{p.scans(num(q.scan_count ?? 0, locale))}</span>
              {q.img && (
                <a href={q.img} download={`${q.animals?.animal_code}-qr.png`} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <Download size={13} /> {p.download}
                </a>
              )}
            </div>
            {q.animals && (
              <QrSignDownload
                url={q.url}
                code={q.animals.animal_code}
                name={q.animals.name}
                nameKm={q.animals.khmer_name}
                species={q.animals.species?.common_name ?? null}
                speciesKm={q.animals.species?.khmer_name ?? null}
                image={q.animals.main_image_url}
                label={locale === "km" ? "ទាញយកផ្លាកសម្រាប់បោះពុម្ព" : "Download printable sign"}
                className="btn-primary mt-3 w-full py-2 text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
