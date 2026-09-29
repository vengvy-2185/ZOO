import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Eye, Heart, MessageCircle, MapPin, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { onAir, recentLives } from "@/lib/server/live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live from the zoo", description: "Watch our animals live, filmed by the Green Wild Zoo team — with hearts and comments." };

export default async function LivePage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const lives = await recentLives(30);
  const now = lives.filter(onAir);
  const past = lives.filter((l) => !onAir(l));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Radio}
        eyebrow={km ? "ផ្ទាល់ពីសួនសត្វ" : "Live from the zoo"}
        title={km ? "ផ្សាយផ្ទាល់" : "Live"}
        subtitle={km ? "ក្រុមការងាររបស់យើងផ្សាយផ្ទាល់ពីទ្រុងសត្វ៖ ពេលចិញ្ចឹម ពេលលេង និងរឿងគួរឱ្យស្រឡាញ់។ ចុចបេះដូង និងបញ្ចេញមតិបាន!" : "Our team films live from the enclosures: feeding time, play time and sweet moments. Send hearts and comments!"}
      />
      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-12 md:px-6">
        {now.length ? (
          now.map((l) => (
            <Link key={l.id} href={`/live/${l.id}`} className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-600 to-orange-500 p-6 text-white shadow-lift">
              <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
              <span className="flex items-center gap-2 text-xs font-black tracking-[0.2em]"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> {km ? "កំពុងផ្សាយផ្ទាល់" : "LIVE NOW"}</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold">{l.title}</h2>
              {l.place && <p className="mt-1 flex items-center gap-1 text-white/85"><MapPin size={16} /> {l.place}</p>}
              <div className="mt-4 flex items-center gap-4 text-sm font-bold">
                <span className="flex items-center gap-1"><Eye size={16} /> {l.viewers_now}</span>
                <span className="flex items-center gap-1"><Heart size={16} /> {l.likes}</span>
                <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-extrabold text-red-600 transition group-hover:scale-105"><PlayCircle size={18} /> {km ? "មើលឥឡូវ" : "Watch now"}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
            <Radio size={40} className="mx-auto text-primary/40" />
            <p className="mt-3 font-display text-xl font-extrabold text-forest">{km ? "មិនទាន់មានការផ្សាយផ្ទាល់ពេលនេះទេ" : "Nothing live right now"}</p>
            <p className="mt-1 text-sm text-ink/55">{km ? "បើកការជូនដំណឹង ដើម្បីដឹងភ្លាមពេលយើងចាប់ផ្តើមផ្សាយ។" : "Turn on notifications to know the moment we go live."}</p>
          </div>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold text-forest">{km ? "ការផ្សាយមុនៗ" : "Earlier lives"}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {past.map((l) => (
                <li key={l.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                  <p className="font-bold text-forest">{l.title}</p>
                  <p className="text-xs text-ink/50">{when(l.started_at)}{l.place ? ` · ${l.place}` : ""}</p>
                  <p className="mt-2 flex gap-4 text-xs font-bold text-ink/55">
                    <span className="flex items-center gap-1"><Eye size={13} /> {l.peak_viewers}</span>
                    <span className="flex items-center gap-1"><Heart size={13} /> {l.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={13} /> {l.comments}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
