import { Star } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ReviewForm, Stars } from "@/components/visitor/Reviews";
import { ReviewCard } from "@/components/visitor/ReviewCard";
import { getReviews } from "@/lib/data/zoo";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export default async function ReviewsPage() {
  const { locale, t } = getI18n();
  const r = t.reviews;
  const [{ reviews, counts, average, total }, me] = await Promise.all([getReviews(), getSessionUser()]);
  const { data: mine } = me
    ? await createClient().from("reviews").select("rating, comment").eq("user_id", me.id).maybeSingle()
    : { data: null };

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Star} eyebrow={r.eyebrow} title={r.title} subtitle={r.subtitle} />
      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            {/* Summary */}
            <div className="card p-5">
              <div className="flex items-end gap-3">
                <span className="font-display text-6xl font-extrabold leading-none text-forest">{average.toFixed(1)}</span>
                <div className="pb-1">
                  <Stars value={average} size={20} />
                  <div className="text-xs text-ink/50">
                    {r.outOf}, {r.basedOn(total)}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {counts.map((c) => (
                  <div key={c.star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-bold text-ink/60">{c.star}</span>
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: total ? `${(c.count / total) * 100}%` : 0 }} />
                    </div>
                    <span className="w-6 text-right text-ink/50">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <ReviewForm signedIn={!!me} mine={mine} />
          </div>

          <div>
            {reviews.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-primary/15 bg-white/60 p-10 text-center text-sm text-ink/55">{r.empty}</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2" data-reveal-stagger>
                {reviews.map((rv) => (
                  <ReviewCard key={rv.id} review={rv} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
