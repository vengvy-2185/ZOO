"use client";

import { useEffect, useState } from "react";
import { Smartphone, Bell, BellOff, Download, Share, SquarePlus, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Push = "unsupported" | "needs-install" | "denied" | "off" | "on";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

/**
 * Install the site as an app on the phone, and turn on notifications
 * (SOS, covers, schedule changes, shift reminders).
 * `compact`: a small card that hides itself once everything is set up.
 */
export function AppSetup({ km, compact = false }: { km: boolean; compact?: boolean }) {
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [push, setPush] = useState<Push>("off");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setInstalled(standalone);
    setIos(isIos);
    setCanPrompt(Boolean((window as any).__gwzInstall));
    const ready = () => setCanPrompt(true);
    addEventListener("gwz-install-ready", ready);
    addEventListener("appinstalled", () => setInstalled(true));
    try {
      setHidden(localStorage.getItem("gwz-appsetup-hide") === "1");
    } catch {}
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setPush(isIos && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setPush("denied");
      const reg = await navigator.serviceWorker.ready;
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
    return () => removeEventListener("gwz-install-ready", ready);
  }, []);

  const install = async () => {
    const e = (window as any).__gwzInstall;
    if (!e) return;
    e.prompt();
    const r = await e.userChoice.catch(() => null);
    if (r?.outcome === "accepted") setInstalled(true);
    (window as any).__gwzInstall = null;
    setCanPrompt(false);
  };

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPush(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { key } = await fetch("/api/push").then((r) => r.json());
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) throw new Error();
      setPush("on");
      await fetch("/api/push", { method: "PUT" });
      setMsg(km ? "បានបើក! អ្នកនឹងទទួលសារសាកល្បងមួយឥឡូវនេះ។" : "Turned on! A test notification is on its way.");
    } catch {
      setMsg(km ? "មិនអាចបើកបានទេ។ សូមព្យាយាមម្តងទៀត។" : "Couldn't turn it on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setPush("off");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const r = await fetch("/api/push", { method: "PUT" }).then((x) => x.json()).catch(() => null);
    setMsg(r?.sent ? (km ? "បានផ្ញើសារសាកល្បង ✓" : "Test sent ✓") : km ? "មិនទាន់មានទូរស័ព្ទចុះឈ្មោះ" : "No phone registered yet");
    setBusy(false);
  };

  const allSet = installed && push === "on";
  if (compact && (allSet || hidden)) return null;

  return (
    <section className={cn("card relative overflow-hidden p-4 md:p-5", compact && "ring-2 ring-[#BFDBFE]")}>
      {compact && (
        <button
          type="button"
          aria-label={km ? "បិទ" : "Hide"}
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem("gwz-appsetup-hide", "1");
            } catch {}
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      )}
      <h2 className="flex items-center gap-2 pr-8 font-display text-lg font-extrabold text-forest">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white"><Smartphone size={20} /></span>
        {km ? "កម្មវិធីលើទូរស័ព្ទ និងការជូនដំណឹង" : "Phone app and notifications"}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        {km ? "ដាក់ Green Wild Zoo នៅលើអេក្រង់ទូរស័ព្ទដូចកម្មវិធី ហើយទទួលការរំលឹកវេន SOS ការស្នើជំនួស និងការកែកាលវិភាគ ភ្លាមៗ។" : "Put Green Wild Zoo on your home screen like an app, and get shift reminders, SOS, cover requests and schedule changes straight away."}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {/* 1. install */}
        <div className="rounded-2xl bg-[#F4F7FF] p-3 ring-1 ring-[#DBEAFE]">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#1E3A8A]"><Download size={16} /> {km ? "១. ដំឡើងកម្មវិធី" : "1. Install the app"}</p>
          {installed ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> {km ? "បានដំឡើងរួចហើយ" : "Installed"}</p>
          ) : canPrompt ? (
            <button type="button" onClick={install} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-2.5 text-sm font-extrabold text-white shadow-soft active:scale-95">
              <Download size={16} /> {km ? "ដំឡើងលើទូរស័ព្ទនេះ" : "Install on this phone"}
            </button>
          ) : ios ? (
            <ol className="mt-2 space-y-1.5 text-xs font-semibold text-ink/70">
              <li className="flex items-center gap-1.5">{km ? "ក្នុង Safari ចុច" : "In Safari tap"} <Share size={14} className="text-[#1D4ED8]" /> {km ? "(ចែករំលែក)" : "(Share)"}</li>
              <li className="flex items-center gap-1.5">{km ? "ជ្រើស" : "Choose"} <SquarePlus size={14} className="text-[#1D4ED8]" /> {km ? "«Add to Home Screen»" : "“Add to Home Screen”"}</li>
              <li>{km ? "ចុច «Add» · បើកកម្មវិធីពីអេក្រង់ដើម" : "Tap “Add” · open the app from the home screen"}</li>
            </ol>
          ) : (
            <p className="mt-2 text-xs font-semibold text-ink/60">{km ? "ក្នុង Chrome ចុច ⋮ (ខាងលើស្តាំ) → «Install app» ឬ «Add to Home screen»។" : "In Chrome tap ⋮ (top right) → “Install app” or “Add to Home screen”."}</p>
          )}
        </div>

        {/* 2. notifications */}
        <div className="rounded-2xl bg-[#F4F7FF] p-3 ring-1 ring-[#DBEAFE]">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#1E3A8A]"><Bell size={16} /> {km ? "២. ការជូនដំណឹង" : "2. Notifications"}</p>
          {push === "on" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> {km ? "បានបើក" : "On"}</span>
              <button type="button" onClick={test} disabled={busy} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{km ? "សាកល្បង" : "Test"}</button>
              <button type="button" onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-ink/50 hover:bg-white"><BellOff size={13} /> {km ? "បិទ" : "Turn off"}</button>
            </div>
          ) : push === "needs-install" ? (
            <p className="mt-2 text-xs font-semibold text-ink/60">{km ? "នៅលើ iPhone ត្រូវដំឡើងកម្មវិធីជាមុនសិន (ជំហានទី ១) រួចបើកពីអេក្រង់ដើម ទើបអាចបើកការជូនដំណឹងបាន (iOS 16.4 ឡើង)។" : "On iPhone, install the app first (step 1) and open it from the home screen, then turn on notifications (iOS 16.4+)."}</p>
          ) : push === "denied" ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{km ? "ការជូនដំណឹងត្រូវបានបិទក្នុងការកំណត់ទូរស័ព្ទ។ សូមបើក «Notifications» សម្រាប់ website/កម្មវិធីនេះក្នុងការកំណត់។" : "Notifications are blocked in the phone settings. Allow “Notifications” for this site/app in the settings."}</p>
          ) : push === "unsupported" ? (
            <p className="mt-2 text-xs font-semibold text-ink/60">{km ? "កម្មវិធីរុករកនេះមិនគាំទ្រការជូនដំណឹងទេ។ សូមប្រើ Chrome (Android) ឬ Safari (iPhone)។" : "This browser can't show notifications. Use Chrome (Android) or Safari (iPhone)."}</p>
          ) : (
            <button type="button" onClick={turnOn} disabled={busy} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-2.5 text-sm font-extrabold text-white shadow-soft active:scale-95 disabled:opacity-70">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} {km ? "បើកការជូនដំណឹង" : "Turn on notifications"}
            </button>
          )}
        </div>
      </div>
      {msg && <p className="mt-2 text-sm font-bold text-[#1D4ED8]">{msg}</p>}
    </section>
  );
}
