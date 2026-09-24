import Link from "next/link";
import Image from "next/image";
import { Newspaper, ArrowRight, CalendarDays } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getNews } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate } from "@/lib/utils/age";

export default async function NewsPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  const posts = await getNews();

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Newspaper} eyebrow={t.news.eyebrow} title={t.news.title} subtitle={t.news.subtitle} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        {posts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-primary/15 bg-white/60 p-10 text-center text-sm text-ink/55">{t.news.empty}</div>
        ) : (
          <div className={`mx-auto grid gap-5 sm:grid-cols-2 ${posts.length >= 3 ? "lg:grid-cols-3" : "max-w-4xl"}`} data-reveal-stagger>
            {posts.map((p) => (
              <Link key={p.id} href={`/news/${p.id}`} className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
                <div className="relative aspect-[16/10] flex-shrink-0 overflow-hidden bg-light-green">
                  {p.image_url && <Image src={p.image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/45">
                    <CalendarDays size={13} /> {formatFullDate(p.published_at, locale)}
                  </span>
                  <h2 className="line-clamp-2 font-display text-xl font-extrabold leading-snug text-forest">{(km && p.title_km) || p.title}</h2>
                  {((km && p.summary_km) || p.summary) && <p className="line-clamp-3 text-sm leading-relaxed text-ink/65">{(km && p.summary_km) || p.summary}</p>}
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold text-primary">
                    {t.news.readMore} <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
