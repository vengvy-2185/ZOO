"use client";

import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";

/** "Use my location": fills the zoo's latitude/longitude inputs from this device (stand at the staff entrance). */
export function GeoFill({ km }: { km: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setMsg(null);
          navigator.geolocation?.getCurrentPosition(
            (p) => {
              const set = (n: string, v: number) => {
                const el = document.querySelector<HTMLInputElement>(`input[name=${n}]`);
                if (el) el.value = v.toFixed(6);
              };
              set("zoo_lat", p.coords.latitude);
              set("zoo_lng", p.coords.longitude);
              setMsg(`±${Math.round(p.coords.accuracy)} m`);
              setBusy(false);
            },
            () => {
              setMsg(km ? "មិនអាចយកទីតាំងបានទេ" : "Couldn't get the location");
              setBusy(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#EEF2FF] px-3 py-2 text-xs font-bold text-[#1E3A8A] hover:bg-[#E0E7FF]"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />} {km ? "ប្រើទីតាំងខ្ញុំឥឡូវ" : "Use my current location"}
      </button>
      {msg && <span className="text-xs text-ink/50">{msg}</span>}
    </div>
  );
}
