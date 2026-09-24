"use client";

import { useState, useTransition } from "react";
import { MousePointerClick, Save } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ZooMapArtwork } from "@/components/visitor/ZooMapArtwork";
import { saveMarkerPosition } from "./actions";

interface EditableMarker {
  id: string;
  kind: "animal" | "facility";
  label: string;
  icon: string;
  map_x: number;
  map_y: number;
}

export function MapEditorCanvas({
  markers: initial,
  backgroundImageUrl,
}: {
  markers: EditableMarker[];
  backgroundImageUrl?: string;
}) {
  const [markers, setMarkers] = useState(initial);
  const [selected, setSelected] = useState<EditableMarker | null>(null);
  const [isPending, startTransition] = useTransition();

  // Pointer events (not mouse events) so markers can be dragged by touch too.
  function onDrag(e: React.PointerEvent<HTMLDivElement>, marker: EditableMarker) {
    e.preventDefault();
    const canvas = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();

    function move(ev: PointerEvent) {
      const x = Math.min(100, Math.max(0, ((ev.clientX - canvas.left) / canvas.width) * 100));
      const y = Math.min(100, Math.max(0, ((ev.clientY - canvas.top) / canvas.height) * 100));
      setMarkers((prev) => prev.map((m) => (m.id === marker.id ? { ...m, map_x: x, map_y: y } : m)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMarkers((prev) => {
        const updated = prev.find((m) => m.id === marker.id);
        if (updated) setSelected(updated);
        return prev;
      });
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function save() {
    if (!selected) return;
    startTransition(async () => {
      await saveMarkerPosition(selected.kind, selected.id, selected.map_x, selected.map_y);
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="relative aspect-[4/3] flex-1 touch-none overflow-hidden rounded-[1.75rem] bg-[#BFDDA0] shadow-lift ring-4 ring-white">
        {backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundImageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <ZooMapArtwork />
          </svg>
        )}
        {markers.map((m) => (
          <div
            key={m.id}
            onPointerDown={(e) => onDrag(e, m)}
            onClick={() => setSelected(m)}
            title={m.label}
            className={cn(
              "absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab select-none items-center justify-center rounded-full border-[3px] border-white text-lg shadow-lg transition-transform active:scale-110 active:cursor-grabbing",
              m.kind === "animal" ? "bg-accent" : "bg-white",
              selected?.id === m.id && "z-10 ring-4 ring-primary"
            )}
            style={{ left: `${m.map_x}%`, top: `${m.map_y}%` }}
          >
            {m.icon}
          </div>
        ))}
      </div>

      <div className="card h-fit w-full flex-shrink-0 p-5 lg:w-72">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-forest">
          <MousePointerClick size={18} className="text-primary" />
          Selected {selected ? (selected.kind === "animal" ? "Animal" : "Facility") : "Marker"}
        </h3>
        {selected ? (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
              <span className="text-2xl">{selected.icon}</span>
              <span className="font-bold text-forest">{selected.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-light-green px-3 py-2">
                <div className="text-[10px] font-bold uppercase text-primary/70">X</div>
                <div className="font-display text-lg font-bold text-forest">{selected.map_x.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl bg-light-green px-3 py-2">
                <div className="text-[10px] font-bold uppercase text-primary/70">Y</div>
                <div className="font-display text-lg font-bold text-forest">{selected.map_y.toFixed(1)}%</div>
              </div>
            </div>
            <button onClick={save} disabled={isPending} className="btn-primary w-full hover:translate-y-0">
              <Save size={16} /> {isPending ? "Saving…" : "Save Location"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink/50">Tap a marker to select it, then drag it to its new position.</p>
        )}
        <div className="mt-4 space-y-1.5 border-t border-black/5 pt-4 text-xs text-ink/55">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white bg-accent shadow" /> Animal
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white bg-white shadow ring-1 ring-black/10" /> Facility
          </div>
        </div>
      </div>
    </div>
  );
}
