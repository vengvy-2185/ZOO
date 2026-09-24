"use client";

import { useEffect, useState } from "react";
import { Type, Volume2, Square } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { TEXT_SIZE_KEY } from "@/lib/text-size";

const SIZES = { md: "", lg: "118.75%", xl: "131.25%" } as const;
type Size = keyof typeof SIZES;

/** Bigger text for the whole site, remembered on this device. */
export function TextSizeControl() {
  const { locale } = useI18n();
  const km = locale === "km";
  const [size, setSize] = useState<Size>("md");
  useEffect(() => {
    try {
      const s = localStorage.getItem(TEXT_SIZE_KEY) as Size | null;
      if (s && s in SIZES) setSize(s);
    } catch {
      /* ignore */
    }
  }, []);
  const choose = (s: Size) => {
    setSize(s);
    document.documentElement.style.fontSize = SIZES[s];
    try {
      localStorage.setItem(TEXT_SIZE_KEY, s);
    } catch {
      /* ignore */
    }
  };
  const labels: Record<Size, string> = km ? { md: "ធម្មតា", lg: "ធំ", xl: "ធំណាស់" } : { md: "Normal", lg: "Large", xl: "Extra large" };
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
        <Type size={22} className="text-primary" /> {km ? "ទំហំអក្សរលើគ្រប់ទំព័រ" : "Text size on every page"}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(Object.keys(SIZES) as Size[]).map((s, i) => (
          <button
            key={s}
            onClick={() => choose(s)}
            className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-3 font-bold transition", size === s ? "border-primary bg-light-green text-primary" : "border-black/10 bg-white text-forest")}
          >
            <span className="font-display leading-none" style={{ fontSize: `${1.2 + i * 0.45}rem` }}>
              Aa
            </span>
            <span className="text-sm">{labels[s]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Reads the page's main information out loud with the phone's own voice. */
export function ReadAloud({ targetId }: { targetId: string }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);
  if (!supported) return null;
  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = document.getElementById(targetId)?.innerText ?? "";
    const u = new SpeechSynthesisUtterance(text);
    const lang = km ? "km" : "en";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.lang = km ? "km-KH" : "en-US";
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }
  return (
    <button onClick={toggle} className="btn-primary w-full justify-center py-3.5 text-base hover:translate-y-0">
      {speaking ? <Square size={18} /> : <Volume2 size={20} />} {speaking ? (km ? "ឈប់អាន" : "Stop reading") : km ? "អានព័ត៌មាននេះឲ្យខ្ញុំស្តាប់" : "Read this page to me"}
    </button>
  );
}
