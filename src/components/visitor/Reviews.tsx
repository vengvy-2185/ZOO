"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Loader2, Send, Trash2, CheckCircle2, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { saveReview, deleteMyReview } from "@/app/reviews/actions";

/** Read-only star row (supports halves via a clipped overlay). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)} aria-label={`${value.toFixed(1)} / 5`}>
      <span className="flex text-black/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-amber-400" style={{ width: `${(value / 5) * 100}%` }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="flex-shrink-0" />
        ))}
      </span>
    </span>
  );
}

export function ReviewForm({ signedIn, mine }: { signedIn: boolean; mine: { rating: number; comment: string } | null }) {
  const { t } = useI18n();
  const r = t.reviews;
  const router = useRouter();
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <span className="text-4xl">✍️</span>
        <p className="font-display text-lg font-bold text-forest">{r.writeTitle}</p>
        <Link href="/account/login?next=/reviews" className="btn-primary">
          <LogIn size={16} /> {r.loginToWrite}
        </Link>
      </div>
    );
  }

  const shown = hover || rating;
  const submit = () =>
    start(async () => {
      const res = await saveReview(rating, comment);
      setStatus("ok" in res ? "saved" : "error");
      if ("ok" in res) router.refresh();
    });

  return (
    <div className="card space-y-4 p-5">
      <p className="font-display text-lg font-bold text-forest">{mine ? r.editTitle : r.writeTitle}</p>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink/50">{r.yourRating}</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n}`}
              className="transition hover:scale-125 active:scale-95"
            >
              <Star size={34} strokeWidth={1.5} className={n <= shown ? "fill-amber-400 text-amber-400" : "text-black/20"} />
            </button>
          ))}
          {shown > 0 && <span className="ml-2 text-sm font-bold text-amber-600">{r.stars[shown - 1]}</span>}
        </div>
      </div>
      <textarea
        value={comment}
        maxLength={500}
        rows={4}
        onChange={(e) => setComment(e.target.value)}
        placeholder={r.placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div className="flex items-center justify-between text-[11px] text-ink/40">
        <span>{comment.length}/500</span>
      </div>
      {status === "saved" && (
        <p className="flex items-center gap-2 rounded-2xl bg-light-green px-4 py-2.5 text-sm font-bold text-primary">
          <CheckCircle2 size={16} /> {r.saved}
        </p>
      )}
      {status === "error" && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{r.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={submit} disabled={pending || rating === 0 || comment.trim().length < 3} className="btn-primary flex-1 hover:translate-y-0 disabled:opacity-50">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {mine ? r.update : r.submit}
        </button>
        {mine && (
          <button
            onClick={() =>
              start(async () => {
                await deleteMyReview();
                setRating(0);
                setComment("");
                setStatus("idle");
                router.refresh();
              })
            }
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-red-50 px-4 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={15} /> {r.delete}
          </button>
        )}
      </div>
    </div>
  );
}
