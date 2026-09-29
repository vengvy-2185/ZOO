"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Heart, PlayCircle, MapPin, Loader2 } from "lucide-react";
import { startViewer } from "@/lib/live-net";
import { useI18n } from "@/lib/i18n/client";

type Now = { id: string; title: string; place: string | null; viewers: number; likes: number; ice: RTCIceServer[] } | null;

/**
 * Home page: while the zoo is live, the live video itself plays here (muted),
 * big and first on the page. Tapping it opens the live with sound and comments.
 */
export function LiveHomeHero() {
  const { locale } = useI18n();
  const km = locale === "km";
  const [live, setLive] = useState<Now>(null);
  const [viewers, setViewers] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  // is anyone live? (checked again every 20 s)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/live/now", { cache: "no-store" })
        .then((r) => r.json())
        .then((x: Now) => {
          if (!alive) return;
          setLive((cur) => (cur?.id === x?.id ? cur : x));
          if (x) setViewers(x.viewers);
        })
        .catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // show the real picture (muted) while it's on the page
  useEffect(() => {
    if (!live) return;
    setPlaying(false);
    const net = startViewer(live.id, live.ice, {
      onViewers: setViewers,
      onStream: (s) => {
        const v = video.current;
        if (v && v.srcObject !== s) {
          v.srcObject = s;
          v.muted = true;
          v.play().catch(() => {});
        }
      },
      onState: (st) => {
        if (st === "ended") setLive(null);
      },
    });
    return () => {
      net.stop();
    };
  }, [live]);

  if (!live) return null;
  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 md:px-6 md:pt-5">
      <Link href={`/live/${live.id}`} className="group relative block overflow-hidden rounded-[2rem] bg-black shadow-lift ring-4 ring-red-500/80">
        <div className="relative aspect-[4/5] w-full sm:aspect-video md:max-h-[72vh]">
          <video ref={video} autoPlay playsInline muted onPlaying={() => setPlaying(true)} className="absolute inset-0 h-full w-full object-cover" />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-700 via-red-700 to-black">
              <Loader2 size={40} className="animate-spin text-white/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
          <div className="absolute left-4 top-4 flex items-center gap-2 text-white">
            <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-xs font-black tracking-wider">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold backdrop-blur"><Eye size={14} /> {viewers}</span>
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs font-bold backdrop-blur"><Heart size={14} className="fill-rose-500 text-rose-500" /> {live.likes}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white md:p-8">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">{km ? "កំពុងផ្សាយផ្ទាល់ពីសួនសត្វ" : "Live from the zoo now"}</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight drop-shadow md:text-4xl">{live.title}</h2>
              {live.place && <p className="mt-1 flex items-center gap-1 text-sm text-white/85"><MapPin size={15} /> {live.place}</p>}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-extrabold text-red-600 shadow-lift transition group-hover:scale-105">
              <PlayCircle size={20} /> {km ? "ចុចមើលផ្ទាល់" : "Watch live"}
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
