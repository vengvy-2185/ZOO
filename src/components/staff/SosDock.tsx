"use client";

import { useEffect, useState } from "react";
import { Siren, X, MapPin, Phone, CheckCircle2, Stethoscope, PawPrint, ShieldAlert, Flame, Baby } from "lucide-react";
import { resolveSos } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

export type DockAlert = { id: string; kind: string; place: string | null; note: string | null; lat: number | null; lng: number | null; created_at: string; name: string; phone: string | null; own: boolean };

const KINDS: Record<string, { Icon: typeof Siren; en: string; km: string }> = {
  medical: { Icon: Stethoscope, en: "Someone is hurt", km: "មានអ្នករបួស/ឈឺ" },
  animal: { Icon: PawPrint, en: "Animal escaped", km: "សត្វរត់ចេញ" },
  security: { Icon: ShieldAlert, en: "Security", km: "បញ្ហាសន្តិសុខ" },
  fire: { Icon: Flame, en: "Fire / smoke", km: "ភ្លើង/ផ្សែង" },
  child: { Icon: Baby, en: "Lost child", km: "ក្មេងវង្វេង" },
  other: { Icon: Siren, en: "Emergency", km: "បន្ទាន់" },
};

/**
 * Open SOS alerts as a small pulsing button (it never covers the page).
 * Tap it for a sheet with every alert: map, call and "resolved".
 * A new alert opens the sheet once by itself.
 */
export function SosDock({ alerts, km }: { alerts: DockAlert[]; km: boolean }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const newest = alerts[0]?.id ?? "";
  useEffect(() => {
    if (!newest) return setOpen(false);
    try {
      if (sessionStorage.getItem("gwz_sos_seen") !== newest) {
        sessionStorage.setItem("gwz_sos_seen", newest);
        if (!alerts[0].own) setOpen(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!alerts.length) return null;
  const first = KINDS[alerts[0].kind] ?? KINDS.other;
  const ago = (iso: string) => {
    const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
    return km ? (m ? `${m} នាទីមុន` : "ឥឡូវនេះ") : m ? `${m} min ago` : "just now";
  };

  return (
    <>
      {/* the small button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-[65] flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 py-2 pl-2 pr-4 text-white shadow-lift ring-4 ring-white/80 transition hover:scale-105 active:scale-95 md:bottom-6 md:left-6"
        aria-label="SOS"
      >
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600"><first.Icon size={18} /></span>
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-extrabold">SOS{alerts.length > 1 && ` × ${alerts.length}`}</span>
          <span className="block max-w-[9rem] truncate text-[11px] font-semibold text-white/85">{km ? first.km : first.en}</span>
        </span>
      </button>

      {/* the sheet */}
      <div className={cn("fixed inset-0 z-[80] transition", open ? "visible" : "invisible")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-lg overflow-hidden rounded-t-[2rem] bg-white shadow-lift transition-transform duration-300 md:bottom-6 md:rounded-[2rem]", open ? "translate-y-0" : "translate-y-full md:translate-y-[120%]")}>
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 text-white">
            <Siren size={22} />
            <p className="flex-1 font-display text-lg font-extrabold">SOS · {alerts.length} {km ? "កំពុងរង់ចាំ" : "open"}</p>
            <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="close"><X size={18} /></button>
          </div>
          <div className="max-h-[calc(85dvh-4.5rem)] space-y-3 overflow-y-auto p-4">
            {alerts.map((a) => {
              const K = KINDS[a.kind] ?? KINDS.other;
              return (
                <div key={a.id} className="rounded-3xl bg-red-50/60 p-4 ring-1 ring-red-100">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm"><K.Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-extrabold text-red-700">{km ? K.km : K.en}</p>
                      <p className="text-xs font-semibold text-ink/60">
                        {a.own ? (km ? "អ្នក" : "You") : a.name} · {ago(a.created_at)}
                      </p>
                      {a.place && <p className="mt-1 flex items-center gap-1 text-sm font-bold text-forest"><MapPin size={14} className="text-red-500" /> {a.place}</p>}
                      {a.note && <p className="mt-1.5 rounded-xl bg-white px-3 py-2 text-sm text-ink/75 ring-1 ring-black/5">{a.note}</p>}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {a.lat != null ? (
                      <a href={`https://maps.google.com/?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-white py-2.5 text-xs font-bold text-[#1D4ED8] ring-1 ring-black/5 hover:bg-[#EEF2FF]"><MapPin size={17} /> {km ? "ទីតាំង" : "Map"}</a>
                    ) : (
                      <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/60 py-2.5 text-xs font-bold text-ink/30 ring-1 ring-black/5"><MapPin size={17} /> —</span>
                    )}
                    {a.phone && !a.own ? (
                      <a href={`tel:${a.phone}`} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-black/5 hover:bg-emerald-50"><Phone size={17} /> {km ? "ហៅ" : "Call"}</a>
                    ) : (
                      <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/60 py-2.5 text-xs font-bold text-ink/30 ring-1 ring-black/5"><Phone size={17} /> —</span>
                    )}
                    <form action={resolveSos.bind(null, a.id)} className="contents">
                      <button className="flex flex-col items-center gap-1 rounded-2xl bg-red-600 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700"><CheckCircle2 size={17} /> {km ? "ដោះស្រាយរួច" : "Resolved"}</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
