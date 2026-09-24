import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { KhqrPayment } from "@/components/visitor/KhqrPayment";
import { LogoMark } from "@/components/visitor/Logo";
import { PrintButton } from "@/components/visitor/PrintButton";
import { pollKhqr } from "@/lib/server/payments";
import { serviceClient } from "@/lib/server/private-settings";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate } from "@/lib/utils/age";

// Adoption payment (KHQR) and, once paid, the printable certificate.
export default async function AdoptionPage({ params, searchParams }: { params: { code: string }; searchParams: { k?: string } }) {
  const key = searchParams.k ?? "";
  if (!/^[a-f0-9]{16,64}$/i.test(key)) notFound();
  const { data: adoption } = await serviceClient()
    .from("adoptions")
    .select("*, animal:animal_id(name, khmer_name, main_image_url, species:species_id(common_name, khmer_name))")
    .eq("code", params.code)
    .eq("access_key", key)
    .maybeSingle();
  if (!adoption) notFound();
  const { locale, t } = getI18n();
  const a = t.adopt;
  const animal = adoption.animal as any;
  const animalName = (locale === "km" && animal?.khmer_name) || animal?.name;
  const species = (locale === "km" && animal?.species?.khmer_name) || animal?.species?.common_name;

  if (adoption.status !== "paid") {
    const view = await pollKhqr("adoption", params.code, key);
    if (view && view.status !== "paid") {
      return (
        <div className="min-h-screen pb-24 md:pb-10">
          <Navbar />
          <PageHeader icon={HeartHandshake} eyebrow={a.title} title={t.pay.title} subtitle={t.pay.subtitle} />
          <main className="mx-auto max-w-5xl px-4 md:px-6">
            <KhqrPayment kind="adoption" code={params.code} accessKey={key} initial={view} successHref={`/adopt/${params.code}?k=${key}`} />
          </main>
          <BottomNav />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12 print:p-0">
        {/* Certificate */}
        <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-double border-primary/70 bg-cream p-8 text-center shadow-lift print:shadow-none md:p-12">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-leaf/20 blur-2xl" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative">
            <LogoMark className="mx-auto h-16 w-16" />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">Green Wild Zoo</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-forest md:text-4xl">{a.certificate}</h1>
            <p className="mt-6 text-ink/60">{a.certifies}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-primary md:text-4xl">{adoption.adopter_name}</p>
            <p className="mt-4 text-ink/60">{a.hasAdopted}</p>
            <div className="mx-auto mt-4 flex max-w-sm items-center gap-4 rounded-3xl bg-white p-3 text-left shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={animal?.main_image_url ?? ""} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              <div>
                <div className="font-display text-2xl font-extrabold text-forest">{animalName}</div>
                <div className="text-sm text-ink/55">{species}</div>
                <div className="mt-1 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-forest">{a.tiers[adoption.tier]?.name}</div>
              </div>
            </div>
            {adoption.message && <p className="mx-auto mt-5 max-w-md italic text-ink/70">“{adoption.message}”</p>}
            <p className="mx-auto mt-6 max-w-md text-sm text-ink/60">{a.thanks}</p>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-ink/50">
              <span>
                {a.date}: {formatFullDate(adoption.paid_at ?? adoption.created_at, locale)}
              </span>
              <span className="font-mono">{adoption.code}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <PrintButton label={a.print} />
          <Link href="/adopt" className="btn-outline bg-white">
            {a.adoptAnother}
          </Link>
        </div>
      </main>
      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
