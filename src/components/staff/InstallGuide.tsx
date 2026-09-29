"use client";

import { Share, SquarePlus, Bell, X, ArrowDown, ArrowUp, MoreVertical, Download } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export type GuideKind = "ios-safari" | "ios-other" | "ipad" | "android";

/** What kind of phone/browser is this (for the install guide). */
export function guideKind(): GuideKind {
  const ua = navigator.userAgent;
  const ipad = /ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ipad) return "ipad";
  if (/iphone|ipod/i.test(ua)) return /crios|fxios|edgios|opios/i.test(ua) ? "ios-other" : "ios-safari";
  return "android";
}

/**
 * iPhones (and some Android browsers) can't install a website from a button:
 * the person has to use the browser's own menu. This sheet shows exactly
 * where to tap, with an arrow pointing at the button on the screen.
 */
export function InstallGuide({ kind, km, name, icon, onClose }: { kind: GuideKind; km: boolean; name: string; icon: string; onClose: () => void }) {
  const ios = kind !== "android";
  // where the share / menu button is on this screen
  const arrow = kind === "ios-safari" ? "bottom" : "top";
  const steps = ios
    ? [
        {
          Icon: Share,
          km: kind === "ios-safari" ? "ចុចប៊ូតុង «ចែករំលែក» នៅខាងក្រោមអេក្រង់ (ព្រួញចង្អុលខាងក្រោម)" : "ចុចប៊ូតុង «ចែករំលែក» នៅខាងលើស្តាំ (ក្បែរអាសយដ្ឋាន website)",
          en: kind === "ios-safari" ? "Tap the “Share” button at the bottom of the screen (see the arrow)" : "Tap the “Share” button at the top right (next to the address)",
        },
        { Icon: SquarePlus, km: "រំកិលចុះក្រោម ហើយចុច «Add to Home Screen» (បន្ថែមទៅអេក្រង់ដើម)", en: "Scroll down and tap “Add to Home Screen”" },
        { Icon: Download, km: "ចុច «Add» នៅខាងលើស្តាំ — icon នឹងលេចនៅលើអេក្រង់ដើម", en: "Tap “Add” at the top right — the icon appears on your home screen" },
        { Icon: Bell, km: `បើក ${name} ពី icon ថ្មី ហើយចុចប៊ូតុងម្តងទៀត ដើម្បីបើកការជូនដំណឹង`, en: `Open ${name} from the new icon and tap the button again for notifications` },
      ]
    : [
        { Icon: MoreVertical, km: "ចុច ⋮ នៅខាងលើស្តាំរបស់ Chrome", en: "Tap ⋮ at the top right of Chrome" },
        { Icon: Download, km: "ជ្រើស «Install app» ឬ «Add to Home screen»", en: "Choose “Install app” or “Add to Home screen”" },
        { Icon: SquarePlus, km: "ចុច «Install» — icon នឹងលេចនៅលើអេក្រង់ដើម", en: "Tap “Install” — the icon appears on your home screen" },
      ];

  // straight into <body>, so no card or animation around it can box it in
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center" onClick={onClose} role="dialog" aria-modal="true">
      {/* the arrow pointing at the browser's button */}
      {arrow === "bottom" ? (
        <div className="pointer-events-none fixed bottom-2 left-1/2 z-[91] -translate-x-1/2 text-white motion-safe:animate-bounce" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}>
          <ArrowDown size={44} strokeWidth={3} className="drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
        </div>
      ) : (
        <div className="pointer-events-none fixed right-4 top-2 z-[91] text-white motion-safe:animate-bounce" style={{ top: "calc(env(safe-area-inset-top, 0px) + 6px)" }}>
          <ArrowUp size={44} strokeWidth={3} className="drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("relative w-full max-w-md animate-[gwzPop_.25s_ease-out_both] rounded-t-[2rem] bg-white p-5 shadow-lift sm:rounded-[2rem]", arrow === "bottom" ? "mb-16" : "mt-16")}
        style={arrow === "bottom" ? { marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" } : undefined}
      >
        <button type="button" onClick={onClose} aria-label={km ? "បិទ" : "Close"} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink/60">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 pr-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" className="h-14 w-14 rounded-2xl shadow-soft" />
          <div>
            <p className="font-display text-lg font-extrabold leading-tight text-forest">{km ? `ដំឡើង ${name}` : `Install ${name}`}</p>
            <p className="text-xs font-semibold text-ink/55">{ios ? (km ? "នៅលើ iPhone ត្រូវដំឡើងតាម Safari (២០ វិនាទី)" : "On iPhone, install from the browser (20 seconds)") : km ? "ដំឡើងតាមម៉ឺនុយ Chrome" : "Install from the Chrome menu"}</p>
          </div>
        </div>
        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-[#F5F7FF] p-3 ring-1 ring-[#DBE4FF]">
              <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#1D4ED8] shadow-sm ring-1 ring-black/5">
                <s.Icon size={21} />
                <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-[11px] font-extrabold text-white">{km ? "១២៣៤"[i] : i + 1}</span>
              </span>
              <span className="text-sm font-semibold leading-snug text-ink/80">{km ? s.km : s.en}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] py-3 font-extrabold text-white">
          {km ? "យល់ហើយ" : "Got it"}
        </button>
      </div>
    </div>,
    document.body
  );
}
