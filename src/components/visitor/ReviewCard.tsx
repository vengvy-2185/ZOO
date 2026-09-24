import type { Review } from "@/lib/data/zoo";
import { Stars } from "./Reviews";

export function ReviewCard({ review, locale }: { review: Review; locale: string }) {
  const date = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" }).format(
    new Date(review.created_at)
  );
  return (
    <article className="card flex h-full flex-col gap-3 p-5">
      <Stars value={review.rating} />
      <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-ink/75">“{review.comment}”</p>
      <div className="flex items-center gap-2.5">
        {review.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review.avatar_url} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{review.name[0]?.toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-forest">{review.name}</div>
          <div className="text-[11px] text-ink/45">{date}</div>
        </div>
      </div>
    </article>
  );
}
