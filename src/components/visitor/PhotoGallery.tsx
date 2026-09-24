"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GalleryPhoto {
  id: string;
  src: string;
  caption: string | null;
}

// Photo grid whose layout adapts to how many photos there are (a single
// photo is shown large instead of collapsing), plus a full-screen lightbox
// with arrows, keyboard (← → Esc) and swipe support.
export function PhotoGallery({ photos, alt, background }: { photos: GalleryPhoto[]; alt: string; background: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef(0);
  const count = photos.length;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go]);

  const grid = count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  return (
    <>
      <div className={cn("grid gap-3", grid)} data-reveal-stagger="zoom">
        {photos.map((p, i) => {
          const hero = count >= 3 && i === 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left",
                count === 1 ? "aspect-[16/9]" : hero ? "col-span-2 row-span-2 aspect-[4/3] sm:aspect-auto" : "aspect-[4/3]"
              )}
              style={{ background }}
            >
              <Image
                src={p.src}
                alt={p.caption ?? alt}
                fill
                sizes={count === 1 || hero ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 768px) 50vw, 25vw"}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 max-sm:opacity-100" />
              <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-forest opacity-0 shadow-soft transition group-hover:opacity-100">
                <Expand size={15} />
              </span>
              {p.caption && (
                <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-[11px] font-medium leading-snug text-white opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                  {p.caption}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex flex-col bg-black/95 backdrop-blur-sm animate-[lbIn_.25s_ease]"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx > 50) go(-1);
            if (dx < -50) go(1);
          }}
        >
          <style>{`@keyframes lbIn{from{opacity:0}to{opacity:1}}@keyframes lbImg{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}`}</style>
          <div className="flex items-center justify-between p-4 text-sm text-white/70">
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold">
              {open + 1} / {count}
            </span>
            <button onClick={() => setOpen(null)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X size={22} />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={open} src={photos[open].src} alt={photos[open].caption ?? alt} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl animate-[lbImg_.35s_ease]" />
            {count > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 md:left-6">
                  <ChevronLeft size={26} />
                </button>
                <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 md:right-6">
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>
          <div className="p-5 text-center text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
            {photos[open].caption}
            {count > 1 && (
              <div className="mt-3 flex justify-center gap-2">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setOpen(i)}
                    className={cn("relative h-12 w-16 overflow-hidden rounded-lg ring-2 transition", i === open ? "ring-leaf" : "opacity-50 ring-transparent hover:opacity-100")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
