"use client";

import { useState } from "react";
import { Volume2, Siren, Bell, CheckCircle2, XCircle } from "lucide-react";
import { playSound, type SoundName } from "@/lib/client-sound";

/** Buttons to hear each sound (also switches sound on for this page). */
export function SoundTest({ km, volume = 80 }: { km: boolean; volume?: number }) {
  const [res, setRes] = useState<boolean | null>(null);
  const test = (n: SoundName) => playSound(n, volume / 100).then(setRes);
  const B = ({ n, Icon, label }: { n: SoundName; Icon: typeof Siren; label: string }) => (
    <button type="button" onClick={() => test(n)} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3.5 py-2 text-xs font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE] active:scale-95">
      <Icon size={14} /> {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Volume2 size={16} className="text-ink/40" />
      <B n="siren" Icon={Siren} label={km ? "សាកសំឡេង SOS" : "Test SOS siren"} />
      <B n="chime" Icon={Bell} label={km ? "សាកសំឡេងជូនដំណឹង" : "Test chime"} />
      {res === true && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={14} /> {km ? "បានលេង — បើមិនឮ សូមបើកសំឡេងទូរស័ព្ទ" : "Played — if silent, turn up the device volume"}</span>}
      {res === false && <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><XCircle size={14} /> {km ? "Browser បិទសំឡេង — សូមចុចម្តងទៀត" : "Blocked by the browser — tap again"}</span>}
    </div>
  );
}
