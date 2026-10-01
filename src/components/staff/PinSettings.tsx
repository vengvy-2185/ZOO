"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { changePin, lockNow, setLockOnOpen } from "@/app/staff/(protected)/pin-actions";
import { PinModal, PinPad, pinMessage } from "@/components/staff/PinPad";
import { cn } from "@/lib/utils/cn";

/** Me → secret code: ask when the app opens (on/off), change the code, lock now. */
export function PinSettings({ km, lockOnOpen }: { km: boolean; lockOnOpen: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState<null | "toggle" | "old" | "new" | "again">(null);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const L = (en: string, k: string) => (km ? k : en);
  const close = () => {
    setAsk(null);
    setOldPin("");
    setNewPin("");
  };
  const pad =
    ask === "toggle" ? (
      <PinPad key="t" km={km} title={L("Enter your code to change this", "បញ្ចូលលេខកូដ ដើម្បីប្តូរការកំណត់នេះ")} onSubmit={async (p) => {
        const r = await setLockOnOpen(!lockOnOpen, p);
        if (!r.ok) return pinMessage(r, km);
        setMsg(!lockOnOpen ? L("The app will ask for the code when it opens.", "កម្មវិធីនឹងសួរលេខកូដពេលបើក។") : L("The app no longer asks when it opens (pay still needs the code).", "កម្មវិធីលែងសួរលេខកូដពេលបើក (ការមើលប្រាក់ខែនៅតែត្រូវការលេខកូដ)។"));
        close();
        router.refresh();
        return null;
      }} />
    ) : ask === "old" ? (
      <PinPad key="o" km={km} title={L("Your current code", "លេខកូដបច្ចុប្បន្ន")} submitLabel={L("Next", "បន្ទាប់")} onSubmit={async (p) => { setOldPin(p); setAsk("new"); return null; }} />
    ) : ask === "new" ? (
      <PinPad key="n" km={km} title={L("New code", "លេខកូដថ្មី")} submitLabel={L("Next", "បន្ទាប់")} onSubmit={async (p) => { setNewPin(p); setAsk("again"); return null; }} />
    ) : ask === "again" ? (
      <PinPad key="a" km={km} title={L("New code again", "លេខកូដថ្មីម្តងទៀត")} submitLabel={L("Save", "រក្សាទុក")} onSubmit={async (p) => {
        const r = await changePin(oldPin, newPin, p);
        if (!r.ok) {
          setTimeout(() => setAsk(r.error === "mismatch" ? "new" : "old"), 900);
          return pinMessage(r, km);
        }
        setMsg(L("Code changed ✓", "បានប្តូរលេខកូដ ✓"));
        close();
        return null;
      }} />
    ) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-cream/60 p-3">
        <ShieldCheck size={20} className="flex-shrink-0 text-primary" />
        <span className="flex-1 text-sm">
          <b className="block text-forest">{L("Ask for the code when the app opens", "សួរលេខកូដពេលបើកកម្មវិធី")}</b>
          <span className="text-xs text-ink/55">{L("Your pay always needs the code, even when this is off.", "ការមើលប្រាក់ខែត្រូវការលេខកូដជានិច្ច ទោះបិទមុខងារនេះក៏ដោយ។")}</span>
        </span>
        <button type="button" role="switch" aria-checked={lockOnOpen} onClick={() => setAsk("toggle")} className={cn("relative h-7 w-12 flex-shrink-0 rounded-full transition", lockOnOpen ? "bg-primary" : "bg-black/20")}>
          <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", lockOnOpen ? "left-[1.4rem]" : "left-0.5")} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAsk("old")} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-forest ring-1 ring-black/10"><KeyRound size={16} /> {L("Change code", "ប្តូរលេខកូដ")}</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { await lockNow(); router.refresh(); })} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-forest ring-1 ring-black/10"><Lock size={16} /> {L("Lock now", "ចាក់សោឥឡូវ")}</button>
      </div>
      {msg && <p role="status" className="text-sm font-bold text-primary">{msg}</p>}
      {pad && (
        <PinModal onClose={close} closeLabel={L("Close", "បិទ")}>
          {pad}
        </PinModal>
      )}
    </div>
  );
}
