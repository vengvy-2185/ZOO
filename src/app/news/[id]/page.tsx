import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ShareButton } from "@/components/visitor/ShareButton";
import { getNews } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate } from "@/lib/utils/age";

export default async function NewsPostPage({ params }: { params: { id: string } }) {
  const post = (await getNews()).find((p) => p.id === params.id);
  if (!post) notFound();
  const { locale, t } = getI18n();
  const km = locale === "km";
  const title = (km && post.title_km) || post.title;
  const body = (km && post.body_km) || post.body || (km && post.summary_km) || post.summary || "";

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={15} /> {t.news.back}
        </Link>
        <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink/50">
          <CalendarDays size={14} /> {formatFullDate(post.published_at, locale)}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-forest md:text-4xl">{title}</h1>
        {post.image_url && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[2rem] shadow-lift">
            <Image src={post.image_url} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
          </div>
        )}
        <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/80">
          {body.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div className="mt-8">
          <ShareButton title={title} />
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
