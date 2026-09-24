import Link from "next/link";
import { Accessibility, Clock, Ticket, MapPin, Route, Sun, Droplets, Armchair, HandHelping, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { TextSizeControl, ReadAloud } from "@/components/visitor/EasyTools";
import { getI18n } from "@/lib/i18n/server";
import { getTicketTypes, getZonesAndFacilities } from "@/lib/data/zoo";
import { OPENING } from "@/lib/data/events";

export default async function EasyVisitPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const [tickets, { facilities }] = await Promise.all([getTicketTypes().catch(() => []), getZonesAndFacilities().catch(() => ({ facilities: [] as any[] }))]);
  const counts = (facilities as any[]).reduce<Record<string, number>>((m, f) => ((m[f.type] = (m[f.type] ?? 0) + 1), m), {});
  const facilityName = (type: string) => (t.facility as Record<string, string>)[type] ?? t.facility.other;

  const tips = km
    ? [
        { Icon: Sun, text: "មកពេលព្រឹក ពេលអាកាសធាតុត្រជាក់ ហើយសត្វសកម្មបំផុត។" },
        { Icon: Droplets, text: "ពាក់មួក និងយកទឹកមកជាមួយ។ ឈប់សម្រាកឲ្យបានញឹកញាប់។" },
        { Icon: Armchair, text: "ដើរយឺតៗ ហើយសម្រាកនៅកន្លែងអង្គុយ និងកន្លែងញ៉ាំតាមផ្លូវ។" },
        { Icon: HandHelping, text: "ត្រូវការជំនួយ? សួរបុគ្គលិកសួនសត្វណាម្នាក់ក៏បាន។ ពួកយើងរីករាយជួយ។" },
      ]
    : [
        { Icon: Sun, text: "Come in the morning, when it is cooler and the animals are most active." },
        { Icon: Droplets, text: "Wear a hat and bring water. Take plenty of short breaks." },
        { Icon: Armchair, text: "Walk slowly and rest at the seating areas and places to eat along the way." },
        { Icon: HandHelping, text: "Need help? Ask any zoo staff member. We are happy to help." },
      ];

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Accessibility}
        eyebrow={km ? "សម្រាប់ចាស់ទុំ និងគ្រប់គ្នា" : "For older visitors and everyone"}
        title={km ? "ទស្សនាងាយស្រួល" : "Easy Visit"}
        subtitle={km ? "ព័ត៌មានសំខាន់ៗ ជាអក្សរធំ ងាយអាន។ អាចឲ្យទូរស័ព្ទអានឲ្យស្តាប់ក៏បាន។" : "The key information in large, easy text. Your phone can read it to you too."}
      />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-12 text-lg md:px-6">
        <TextSizeControl />
        <ReadAloud targetId="easy-info" />
        <div id="easy-info" className="space-y-5">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-forest">
              <Clock size={26} className="text-primary" /> {km ? "ម៉ោងបើក" : "Opening hours"}
            </h2>
            <p className="mt-2 font-display text-3xl font-extrabold text-primary">
              {OPENING.open} {km ? "ដល់" : "to"} {OPENING.close}
            </p>
            <p className="text-ink/70">{km ? "បើករាល់ថ្ងៃ។" : "Open every day."}</p>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-forest">
              <Ticket size={26} className="text-primary" /> {km ? "តម្លៃសំបុត្រ" : "Ticket prices"}
            </h2>
            <ul className="mt-3 divide-y divide-black/5">
              {(tickets as any[]).map((tt) => (
                <li key={tt.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-semibold text-forest">{(km && tt.khmer_name) || tt.name}</span>
                  <span className="font-display text-2xl font-extrabold text-primary">{Number(tt.price_usd) === 0 ? (km ? "ឥតគិតថ្លៃ" : "Free") : `$${Number(tt.price_usd)}`}</span>
                </li>
              ))}
            </ul>
          </section>
          {Object.keys(counts).length > 0 && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-forest">
                <MapPin size={26} className="text-primary" /> {km ? "កន្លែងសម្រាក និងសេវាកម្ម" : "Places to rest and services"}
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(counts).map(([type, n]) => (
                  <li key={type} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
                    <span className="font-semibold text-forest">{facilityName(type)}</span>
                    <span className="font-display text-2xl font-extrabold text-primary">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card p-5">
            <h2 className="font-display text-2xl font-bold text-forest">{km ? "គន្លឹះសម្រាប់ដំណើរកម្សាន្តស្រួល" : "Tips for a comfortable visit"}</h2>
            <ul className="mt-3 space-y-3">
              {tips.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary">
                    <Icon size={22} />
                  </span>
                  <span className="pt-2 text-ink/80">{text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/map" className="flex items-center justify-between rounded-3xl bg-white p-5 font-display text-xl font-bold text-forest shadow-soft">
            <span className="flex items-center gap-2">
              <MapPin size={24} className="text-primary" /> {km ? "មើលផែនទី" : "See the map"}
            </span>
            <ArrowRight size={22} />
          </Link>
          <Link href="/planner" className="flex items-center justify-between rounded-3xl bg-white p-5 font-display text-xl font-bold text-forest shadow-soft">
            <span className="flex items-center gap-2">
              <Route size={24} className="text-primary" /> {km ? "រៀបចំផ្លូវដើរខ្លី" : "Plan a short route"}
            </span>
            <ArrowRight size={22} />
          </Link>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
