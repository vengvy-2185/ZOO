"use client";

import { useEffect, useRef, useState } from "react";

// How long before the end the video starts easing out, and how long it takes
// to fade back in — capped at these values, but scaled down to a fraction of
// the clip's length so a short clip doesn't spend much of its time faded.
const MAX_FADE_OUT_SECONDS = 1.2;
const MAX_FADE_IN_SECONDS = 1.4;
const FADE_OUT_SHARE = 0.1;
const FADE_IN_SHARE = 0.12;
// Below this length the effect would be constant; use the native seamless loop.
const MIN_DURATION_SECONDS = 4;
// Playback speed during the last FADE_OUT_SECONDS — a gentle slow-motion
// ending instead of an abrupt stop.
const ENDING_PLAYBACK_RATE = 0.6;

// A muted background video that loops forever with a cinematic transition
// at the loop point: the ending slows down and fades to dark, then the video
// restarts and fades back in while settling from a slight zoom. The end and
// start frames are never shown on top of each other (no double-exposure
// "ghosting"), which keeps the picture crisp. Videos too short for the
// effect fall back to the native seamless `loop`.
export function CinematicLoopVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const [tooShort, setTooShort] = useState(false);
  const [fade, setFade] = useState({ out: MAX_FADE_OUT_SECONDS, in: MAX_FADE_IN_SECONDS });
  const fadeOutRef = useRef(MAX_FADE_OUT_SECONDS);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    function onLoadedMetadata() {
      if (!video) return;
      const d = video.duration;
      const out = Math.min(MAX_FADE_OUT_SECONDS, d * FADE_OUT_SHARE);
      fadeOutRef.current = out;
      setFade({ out, in: Math.min(MAX_FADE_IN_SECONDS, d * FADE_IN_SHARE) });
      setTooShort(d < MIN_DURATION_SECONDS);
    }
    function onTimeUpdate() {
      if (!video || !video.duration || video.loop) return;
      if (video.duration - video.currentTime <= fadeOutRef.current && video.playbackRate === 1) {
        video.playbackRate = ENDING_PLAYBACK_RATE;
        setVisible(false);
      }
    }
    function onEnded() {
      if (!video) return;
      video.playbackRate = 1;
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    function onPlaying() {
      // Fade back in only once the restarted video is actually showing
      // frames from the beginning, so the old last frame never flashes.
      if (video && video.currentTime < fadeOutRef.current) setVisible(true);
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  return (
    // Dark backdrop is what the video fades to/from at the loop point.
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-black motion-reduce:hidden">
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop={tooShort}
        playsInline
        preload="auto"
        style={{ transitionDuration: `${(visible ? fade.in : fade.out) * 1000}ms` }}
        className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] ${
          visible ? "scale-100 opacity-100 ease-out" : "scale-105 opacity-0 ease-in"
        }`}
      />
    </div>
  );
}
