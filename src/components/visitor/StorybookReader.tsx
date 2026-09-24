"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { StoryPage } from "@/types/domain";
import { useI18n } from "@/lib/i18n/client";
import { num } from "@/lib/utils/age";
import { cn } from "@/lib/utils/cn";

export function StorybookReader({ title, pages }: { title: string; pages: StoryPage[] }) {
  const { locale, t } = useI18n();
  const [index, setIndex] = useState(0);
  const total = pages.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (total === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <BookOpen size={32} className="mx-auto text-primary" />
        <p className="mt-3 text-sm text-ink/55">{t.story.none}</p>
      </div>
    );
  }

  const page = pages[index];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-light-green px-3 py-1 text-xs font-bold text-primary">
          <BookOpen size={14} /> {t.story.page(num(index + 1, locale), num(total, locale))}
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-forest md:text-4xl">{title}</h1>
      </div>

      <div
        className="relative overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5"
        onTouchStart={(e) => ((e.currentTarget as any)._x = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const startX = (e.currentTarget as any)._x ?? 0;
          const diff = e.changedTouches[0].clientX - startX;
          if (diff > 60) setIndex((i) => Math.max(i - 1, 0));
          if (diff < -60) setIndex((i) => Math.min(i + 1, total - 1));
        }}
      >
        <div key={index} className="grid animate-[fadeIn_.4s_ease] md:grid-cols-2">
          {page.image_url && (
            <div className="relative aspect-[4/3] bg-light-green md:aspect-auto md:min-h-[420px]">
              <Image src={page.image_url} alt={page.title ?? title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          )}
          <div className="flex flex-col justify-center p-7 md:p-10">
            <span className="font-display text-5xl font-extrabold text-light-green">{num(index + 1, locale)}</span>
            {page.title && <h2 className="-mt-3 mb-3 font-display text-2xl font-bold text-primary">{page.title}</h2>}
            <p className="text-lg leading-relaxed text-ink/80">{page.content}</p>
          </div>
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}`}</style>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} className="btn-outline bg-white disabled:opacity-30">
          <ChevronLeft size={17} /> {t.story.prev}
        </button>
        <div className="flex gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={String(i + 1)}
              className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2 bg-black/15")}
            />
          ))}
        </div>
        <button onClick={() => setIndex((i) => Math.min(i + 1, total - 1))} disabled={index === total - 1} className="btn-primary disabled:opacity-30 hover:translate-y-0">
          {t.story.next} <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
