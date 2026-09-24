"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ZooZone, Facility } from "@/types/domain";
import { PawPrint, Compass, Users, Plus, Minus, LocateFixed, Layers, ArrowRight, X } from "lucide-react";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { FACILITY_STYLE, DEFAULT_FACILITY_STYLE as DEFAULT_FACILITY } from "@/lib/icons/facilityIcons";
import { ZooMapArtwork } from "./ZooMapArtwork";
import { useI18n } from "@/lib/i18n/client";

export interface AnimalMarker {
  id: string;
  animal_code: string;
  name: string;
  /** Khmer name, shown when the visitor has chosen ខ្មែរ. */
  name_km?: string | null;
  /** Real photo shown as the map pin (falls back to the category icon). */
  image?: string | null;
  categorySlug?: string | null;
  map_x: number;
  map_y: number;
}

export interface FriendMarker {
  id: string;
  display_name: string;
  avatar_color: string;
  avatar_emoji: string;
  map_x: number | null;
  map_y: number | null;
  isMe?: boolean;
}

interface ZooMapProps {
  zones: ZooZone[];
  facilities: Facility[];
  animals: AnimalMarker[];
  friends?: FriendMarker[];
  highlightAnimalCode?: string;
  placingPin?: boolean;
  onPlacePin?: (x: number, y: number) => void;
  gpsSuggestion?: { x: number; y: number; accuracyPercent: number } | null;
  /** Optional real map image (Admin → Settings); falls back to the illustrated map. */
  backgroundImageUrl?: string;
  /** Hide the legend side panel (e.g. for compact embeds). */
  showLegend?: boolean;
}

export function ZooMap({
  zones,
  facilities,
  animals,
  friends = [],
  highlightAnimalCode,
  placingPin = false,
  onPlacePin,
  gpsSuggestion = null,
  backgroundImageUrl,
  showLegend = true,
}: ZooMapProps) {
  const { locale, t } = useI18n();
  const animalName = (a: AnimalMarker) => (locale === "km" && a.name_km) || a.name;
  const zoneName = (z: ZooZone) =>
    locale === "km" && z.khmer_name ? z.khmer_name.replace(/^តំបន់ [A-Z] - /, "") : z.name.replace(/^Zone [A-Z] - /, "");
  const facilityLabel = (type: string) => (t.facility as Record<string, string>)[type] ?? t.facility.other;
  const [showAnimals, setShowAnimals] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showFriends, setShowFriends] = useState(true);
  const [selected, setSelected] = useState<AnimalMarker | null>(
    animals.find((a) => a.animal_code === highlightAnimalCode) ?? null
  );

  // view.x / view.y are percentages of the container's own box, and
  // view.scale a plain multiplier — one wrapper below gets exactly this
  // transform, and everything inside (SVG art + HTML markers) rides along
  // together, so the two layers can never drift out of alignment.
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const [wheelHint, setWheelHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Active fingers / mouse (for pinch), the current drag, and the last tap (for double-tap).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; origX: number; origY: number; dragging: boolean; pinchDist?: number; pinchScale?: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    dragging: false,
  });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const hintTimer = useRef<ReturnType<typeof setTimeout>>();

  const MAX = 4;
  // Keep the map covering the frame (no empty edges when zoomed).
  const clamp = (v: { scale: number; x: number; y: number }) => {
    const scale = Math.min(MAX, Math.max(1, v.scale));
    const min = 100 - 100 * scale;
    return { scale, x: Math.min(0, Math.max(min, v.x)), y: Math.min(0, Math.max(min, v.y)) };
  };

  /** Point in the frame as % of its box. */
  const relPoint = (clientX: number, clientY: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return { rx: 50, ry: 50 };
    return { rx: ((clientX - box.left) / box.width) * 100, ry: ((clientY - box.top) / box.height) * 100 };
  };

  /** Zoom to `scale`, keeping the map spot under (rx, ry) exactly where it is. */
  const zoomAt = (scale: number, rx = 50, ry = 50, smooth = true) => {
    setAnimating(smooth);
    setView((v) => {
      const mx = (rx - v.x) / v.scale;
      const my = (ry - v.y) / v.scale;
      return clamp({ scale, x: rx - mx * scale, y: ry - my * scale });
    });
  };
  const zoomBy = (delta: number) => zoomAt(view.scale + delta);

  // Wheel: only zoom with Ctrl/⌘ held, so scrolling the page never zooms the map by accident.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        setWheelHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setWheelHint(false), 1400);
        return; // let the page scroll
      }
      e.preventDefault();
      const { rx, ry } = relPoint(e.clientX, e.clientY);
      setView((v) => {
        const scale = v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15);
        const mx = (rx - v.x) / v.scale;
        const my = (ry - v.y) / v.scale;
        return clamp({ scale, x: rx - mx * scale, y: ry - my * scale });
      });
      setAnimating(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toMapPoint = (clientX: number, clientY: number) => {
    const { rx, ry } = relPoint(clientX, clientY);
    const x = (rx - view.x) / view.scale;
    const y = (ry - view.y) / view.scale;
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { ...gesture.current, dragging: true, pinchDist: Math.hypot(a.x - b.x, a.y - b.y), pinchScale: view.scale };
    } else {
      gesture.current = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y, dragging: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnimating(false);

    // Two fingers: pinch to zoom around the midpoint.
    if (pointers.current.size >= 2 && gesture.current.pinchDist) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const { rx, ry } = relPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      const scale = (gesture.current.pinchScale ?? 1) * (dist / gesture.current.pinchDist);
      setView((v) => {
        const mx = (rx - v.x) / v.scale;
        const my = (ry - v.y) / v.scale;
        return clamp({ scale, x: rx - mx * scale, y: ry - my * scale });
      });
      return;
    }

    // One finger / mouse: pan (only when zoomed in — at 1× there's nothing to pan).
    const dx = e.clientX - gesture.current.startX;
    const dy = e.clientY - gesture.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gesture.current.dragging = true;
    if (!gesture.current.dragging || view.scale <= 1) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    setView((v) => clamp({ ...v, x: gesture.current.origX + (dx / box.width) * 100, y: gesture.current.origY + (dy / box.height) * 100 }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger left after a pinch: continue as a pan from here.
      const [rest] = [...pointers.current.values()];
      gesture.current = { startX: rest.x, startY: rest.y, origX: view.x, origY: view.y, dragging: true };
      return;
    }
    const wasDrag = gesture.current.dragging;
    gesture.current.dragging = false;
    gesture.current.pinchDist = undefined;
    if (wasDrag) return;

    // Double-tap / double-click: zoom in on that spot (or back out when fully zoomed).
    const now = Date.now();
    const near = Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y) < 30;
    if (now - lastTap.current.t < 320 && near) {
      lastTap.current.t = 0;
      const { rx, ry } = relPoint(e.clientX, e.clientY);
      if (view.scale >= MAX - 0.01) zoomAt(1);
      else zoomAt(Math.min(MAX, view.scale * 2), rx, ry);
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };

    if (placingPin && onPlacePin) {
      const pt = toMapPoint(e.clientX, e.clientY);
      if (pt) onPlacePin(pt.x, pt.y);
    }
  };

  const resetView = useCallback(() => {
    setAnimating(true);
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  const facilityTypes = Array.from(new Set(facilities.map((f) => f.type)));
  const allOn = showAnimals && showFacilities && (friends.length === 0 || showFriends);

  const chip = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
      active ? "bg-primary text-white shadow-soft" : "bg-white text-forest ring-1 ring-black/10 hover:bg-light-green"
    );

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={chip(allOn)}
          onClick={() => {
            setShowAnimals(true);
            setShowFacilities(true);
            setShowFriends(true);
          }}
        >
          <Layers size={15} /> {t.map.all}
        </button>
        <button onClick={() => setShowAnimals((s) => !s)} className={chip(showAnimals && !allOn)}>
          <PawPrint size={15} /> {t.map.animals}
        </button>
        <button onClick={() => setShowFacilities((s) => !s)} className={chip(showFacilities && !allOn)}>
          <Compass size={15} /> {t.map.facilities}
        </button>
        {friends.length > 0 && (
          <button onClick={() => setShowFriends((s) => !s)} className={chip(showFriends && !allOn)}>
            <Users size={15} /> {t.map.friends}
          </button>
        )}
      </div>

      {placingPin && (
        <div className="mb-3 rounded-2xl bg-accent/25 px-4 py-2.5 text-center text-sm font-semibold text-ink">
          {gpsSuggestion ? t.map.tapConfirm : t.map.tapDrop}
        </div>
      )}

      <div className={cn("grid gap-4", showLegend && "lg:grid-cols-[1fr_250px]")}>
        <div className="relative">
          <div
            ref={containerRef}
            className={cn(
              "relative aspect-[4/3] w-full select-none overflow-hidden rounded-[1.75rem] bg-[#BFDDA0] shadow-lift ring-4 ring-white",
              // At 1× one finger scrolls the page (two fingers still pinch); once zoomed, the map takes all gestures.
              view.scale > 1 ? "touch-none" : "touch-pan-y",
              placingPin ? "cursor-crosshair" : view.scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Single shared transform — map art and HTML markers are both
                children of this one layer, so they can never drift apart. */}
            <div
              className={cn("absolute inset-0 will-change-transform", animating && "transition-transform duration-300 ease-out")}
              style={{ transform: `translate(${view.x}%, ${view.y}%) scale(${view.scale})`, transformOrigin: "0 0" }}
            >
              {backgroundImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backgroundImageUrl} alt="Zoo map" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
              <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {!backgroundImageUrl && <ZooMapArtwork />}

                {zones.map((z) => (
                  <g key={z.id} transform={`translate(${z.map_x ?? 0} ${(z.map_y ?? 0) * 0.75})`}>
                    <ellipse rx="10" ry="6" fill={z.color ?? "#176B3A"} opacity="0.14" />
                    <ellipse
                      rx="10"
                      ry="6"
                      fill="none"
                      stroke={z.color ?? "#176B3A"}
                      strokeWidth="0.35"
                      strokeDasharray="1 0.6"
                      opacity="0.8"
                    />
                  </g>
                ))}

                {gpsSuggestion && (
                  <circle
                    cx={gpsSuggestion.x}
                    cy={gpsSuggestion.y * 0.75}
                    r={Math.min(40, Math.max(2, gpsSuggestion.accuracyPercent))}
                    fill="#2563EB"
                    fillOpacity="0.12"
                    stroke="#2563EB"
                    strokeWidth="0.3"
                    strokeDasharray="0.6 0.6"
                  />
                )}
              </svg>

              <div className="absolute inset-0">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white px-2.5 py-1 text-center text-[11px] font-bold leading-tight text-white shadow-lg"
                    style={{ left: `${z.map_x}%`, top: `${z.map_y}%`, backgroundColor: z.color ?? "#176B3A" }}
                  >
                    {t.common.zone} {z.code}
                    <div className="text-[9px] font-medium opacity-90">{zoneName(z)}</div>
                  </div>
                ))}

                {showFacilities &&
                  facilities.map((f) => {
                    const style = FACILITY_STYLE[f.type] ?? DEFAULT_FACILITY;
                    const Icon = style.icon;
                    return (
                      <div
                        key={f.id}
                        title={(locale === "km" && f.khmer_name) || f.name}
                        className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
                        style={{ left: `${f.map_x}%`, top: `${f.map_y}%`, backgroundColor: style.color }}
                      >
                        <Icon size={13} strokeWidth={2.4} />
                      </div>
                    );
                  })}

                {showAnimals &&
                  animals.map((a) => {
                    // Many animals: smaller pins. Pins also keep their size while zooming,
                    // so zooming in spreads them apart instead of making them bigger.
                    const dense = animals.length > 30;
                    const AnimalIcon = getCategoryIcon(a.categorySlug);
                    const isSel = selected?.id === a.id;
                    return (
                      <button
                        key={a.id}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setSelected(a)}
                        aria-label={animalName(a)}
                        className="group absolute -translate-x-1/2 -translate-y-full"
                        style={{ left: `${a.map_x}%`, top: `${a.map_y}%`, zIndex: isSel ? 20 : 10 }}
                      >
                        {/* Photo pin: round real photo with a pointer tail */}
                        <span className="relative flex flex-col items-center" style={{ transform: `scale(${1 / view.scale})`, transformOrigin: "50% 100%" }}>
                        <span className="relative flex flex-col items-center transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-110">
                          <span
                            className={cn(
                              "flex items-center justify-center overflow-hidden rounded-full shadow-lg",
                              dense ? "h-7 w-7 border-2 md:h-9 md:w-9" : "h-11 w-11 border-[3px] md:h-12 md:w-12",
                              isSel ? "border-primary ring-4 ring-leaf/60" : "border-white",
                              !a.image && "bg-accent text-forest"
                            )}
                          >
                            {a.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.image} alt="" draggable={false} className="h-full w-full object-cover" />
                            ) : (
                              <AnimalIcon size={18} strokeWidth={2.4} />
                            )}
                          </span>
                          <span className={cn("-mt-1 rotate-45 shadow", dense ? "h-2 w-2" : "h-2.5 w-2.5", isSel ? "bg-primary" : "bg-white")} />
                        </span>
                        </span>
                        {isSel && <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 animate-ping rounded-full bg-primary/50" />}
                        <span
                          className={cn(
                            "pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-forest shadow transition-opacity",
                            isSel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {animalName(a)}
                        </span>
                      </button>
                    );
                  })}

                {showFriends &&
                  friends
                    .filter((f) => f.map_x != null && f.map_y != null)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center"
                        style={{ left: `${f.map_x}%`, top: `${f.map_y}%` }}
                      >
                        <span className="mb-0.5 whitespace-nowrap rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold shadow">
                          {f.isMe ? t.map.you : f.display_name}
                        </span>
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-sm shadow-lg",
                            f.isMe && "animate-pulse-marker"
                          )}
                          style={{ backgroundColor: f.avatar_color }}
                        >
                          {f.avatar_emoji}
                        </span>
                      </div>
                    ))}

                {gpsSuggestion && (
                  <div
                    className="absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center"
                    style={{ left: `${gpsSuggestion.x}%`, top: `${gpsSuggestion.y}%` }}
                  >
                    <span className="mb-0.5 whitespace-nowrap rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white shadow">
                      {t.map.approx}
                    </span>
                    <span className="flex h-7 w-7 animate-pulse items-center justify-center rounded-full border-2 border-white bg-blue-500/80 text-sm text-white shadow-lg">
                      📍
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Map controls */}
            {/* How to zoom (appears when someone scrolls over the map without Ctrl) */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[1.75rem] bg-forest/45 text-center text-sm font-bold text-white transition-opacity duration-300",
                wheelHint ? "opacity-100" : "opacity-0"
              )}
            >
              <span className="rounded-2xl bg-black/40 px-4 py-2.5 backdrop-blur">{t.map.wheelHint}</span>
            </div>
            <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-forest shadow-soft backdrop-blur">
              {t.map.zoomHint}
            </p>
            <div className="absolute bottom-3 right-3 z-30 flex flex-col overflow-hidden rounded-2xl bg-white shadow-lift" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => zoomBy(0.3)} aria-label={t.map.zoomIn} className="flex h-10 w-10 items-center justify-center text-forest hover:bg-light-green">
                <Plus size={18} strokeWidth={2.5} />
              </button>
              <button onClick={() => zoomBy(-0.3)} aria-label={t.map.zoomOut} className="flex h-10 w-10 items-center justify-center border-y border-black/5 text-forest hover:bg-light-green">
                <Minus size={18} strokeWidth={2.5} />
              </button>
              <button onClick={resetView} aria-label={t.map.reset} className="flex h-10 w-10 items-center justify-center text-forest hover:bg-light-green">
                <LocateFixed size={17} strokeWidth={2.3} />
              </button>
            </div>

            {/* Compass */}
            <div className="pointer-events-none absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[10px] font-extrabold text-forest shadow-soft">
              N<span className="absolute top-0.5 h-1.5 w-0.5 rounded bg-red-500" />
            </div>
          </div>

          {/* Selected animal card */}
          {selected && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5 sm:absolute sm:bottom-3 sm:left-3 sm:z-30 sm:mt-0 sm:max-w-sm">
              {selected.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.image} alt="" className="h-16 w-20 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                (() => {
                  const Icon = getCategoryIcon(selected.categorySlug);
                  return (
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-light-green text-primary">
                      <Icon size={22} />
                    </span>
                  );
                })()
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-bold leading-tight text-forest">{animalName(selected)}</div>
                <div className="text-xs text-ink/50">{selected.animal_code}</div>
              </div>
              <Link href={`/animals/${selected.animal_code}`} className="btn-primary px-4 py-2">
                {t.common.view} <ArrowRight size={15} />
              </Link>
              <button onClick={() => setSelected(null)} aria-label={t.common.close} className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:bg-black/5">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <aside className="card h-fit p-5">
            <h3 className="font-display text-lg font-bold text-forest">{t.map.legend}</h3>
            {zones.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-widest text-ink/40">{t.map.zones}</p>
                <ul className="space-y-2">
                  {zones.map((z) => (
                    <li key={z.id} className="flex items-center gap-2.5 text-sm">
                      <span className="h-3.5 w-3.5 flex-shrink-0 rounded-md" style={{ backgroundColor: z.color ?? "#176B3A" }} />
                      <span className="font-semibold text-forest">{t.common.zone} {z.code}</span>
                      <span className="truncate text-ink/55">{zoneName(z)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-ink/40">{t.map.places}</p>
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <li className="flex items-center gap-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-forest">
                  <PawPrint size={14} />
                </span>
                {t.map.animal} ({animals.length})
              </li>
              {(facilityTypes.length ? facilityTypes : Object.keys(FACILITY_STYLE)).map((type) => {
                const s = FACILITY_STYLE[type] ?? DEFAULT_FACILITY;
                return (
                  <li key={type} className="flex items-center gap-2.5 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: s.color }}>
                      <s.icon size={14} />
                    </span>
                    {facilityLabel(type)}
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
