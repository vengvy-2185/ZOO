import type { Metadata } from "next";
import { ShoppingBag, MapPin, QrCode } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { CATEGORIES, getProducts } from "@/lib/server/shop";

export const revalidate = 300;
export const metadata: Metadata = { title: "Souvenir shop", description: "Plush animals, T-shirts, krama scarves and more — every souvenir helps care for our animals." };

/** Visitors: what the souvenir shop sells (bought at the shop, cash or KHQR). */
export default async function ShopCatalogue() {
  const { locale } = getI18n();
  const km = locale === "km";
  const products = await getProducts();
  const cats = [...new Set(products.map((p) => p.category))];
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={ShoppingBag}
        eyebrow={km ? "អនុស្សាវរីយ៍" : "Take a memory home"}
        title={km ? "ហាងវត្ថុអនុស្សាវរីយ៍" : "Souvenir shop"}
        subtitle={km ? "តុក្កតាសត្វ អាវយឺត ក្រមាខ្មែរ និងច្រើនទៀត។ ប្រាក់ចំណេញជួយថែរក្សាសត្វរបស់យើង។" : "Plush animals, T-shirts, Khmer krama and more. Every purchase helps care for our animals."}
      />
      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-12 md:px-6">
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-forest">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-soft ring-1 ring-black/5"><MapPin size={16} className="text-primary" /> {km ? "នៅជិតច្រកចូល" : "Next to the main entrance"}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-soft ring-1 ring-black/5"><QrCode size={16} className="text-[#E1232E]" /> {km ? "បង់ជាសាច់ប្រាក់ ឬ KHQR" : "Pay cash or KHQR"}</span>
        </div>
        {cats.map((c) => (
          <section key={c}>
            <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{CATEGORIES[c]?.[km ? 1 : 0] ?? c}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products
                .filter((p) => p.category === c)
                .map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
                    <div className="aspect-square bg-gradient-to-br from-cream to-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-contain p-3" />}
                    </div>
                    <div className="p-3">
                      <p className="font-bold leading-tight text-forest">{(km && p.name_km) || p.name}</p>
                      {p.description && <p className="mt-1 line-clamp-2 text-xs text-ink/55">{p.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-xl font-extrabold text-primary">${p.price_usd.toFixed(2)}</span>
                        {p.stock <= 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">{km ? "អស់" : "Sold out"}</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
