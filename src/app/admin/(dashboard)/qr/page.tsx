import Link from "next/link";
import { QrCode, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { generateQrDataUrl, animalProfileUrl } from "@/lib/utils/qr";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";

export default async function AdminQrPage() {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const { data: qrs } = await supabase
    .from("animal_qr_codes")
    .select("*, animals(id, name, khmer_name, animal_code)")
    .order("scan_count", { ascending: false });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const rows = await Promise.all(
    (qrs ?? []).map(async (q: any) => ({ ...q, img: q.animals ? await generateQrDataUrl(animalProfileUrl(siteUrl, q.animals.animal_code)) : null }))
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
          </div>
        ))}
      </div>
    </div>
  );
}
