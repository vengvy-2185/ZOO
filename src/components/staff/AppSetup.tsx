"use client";

import { useEffect, useState } from "react";
import { Smartphone, Bell, BellOff, Download, Share, SquarePlus, CheckCircle2, Loader2, X, Check, Send, AlarmClock, Siren, LifeBuoy, CalendarRange } from "lucide-react";
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

  const pushDone = push === "on";
  const steps = (installed ? 1 : 0) + (pushDone ? 1 : 0);
  const perks = [
    { Icon: AlarmClock, km: "រំលឹកវេន", en: "Shift reminders", c: "bg-amber-300/25 text-amber-50" },
    { Icon: Siren, km: "SOS ភ្លាមៗ", en: "Instant SOS", c: "bg-red-300/25 text-red-50" },
    { Icon: LifeBuoy, km: "សំណើជំនួស", en: "Cover requests", c: "bg-emerald-300/25 text-emerald-50" },
    { Icon: CalendarRange, km: "កាលវិភាគថ្មី", en: "Schedule changes", c: "bg-sky-200/25 text-sky-50" },
  ];
  const Num = ({ n, done }: { n: number; done: boolean }) => (
    <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-sm transition", done ? "bg-emerald-500 text-white" : "bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white")}>
      {done ? <Check size={18} strokeWidth={3} /> : km ? ["១", "២"][n - 1] : n}
    </span>
  );

  return (
    <section className={cn("relative overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-black/5", compact && "animate-[gwzPop_.4s_ease-out_both]")}>
      {/* hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#7C3AED] px-5 pb-5 pt-5 text-white">
        <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-2xl" />
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
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        )}
        <div className="relative flex items-center gap-4">
          {/* the real app icon, as it looks on the home screen */}
          <span className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/staff-maskable-512.png" alt="" className="h-[72px] w-[72px] rounded-[22px] shadow-[0_10px_25px_-8px_rgba(0,0,0,.55)] ring-2 ring-white/40" />
            {!pushDone && <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-extrabold ring-2 ring-white motion-safe:animate-bounce">1</span>}
          </span>
          <div className="min-w-0 pr-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{km ? "កម្មវិធីសម្រាប់ទូរស័ព្ទ" : "Phone app"}</p>
            <h2 className="font-display text-xl font-extrabold leading-tight md:text-2xl">GWZ {km ? "បុគ្គលិក" : "Staff"}</h2>
            <p className="mt-0.5 text-sm text-white/85">{km ? "បើកលឿនដូចកម្មវិធីពិត ហើយមិនខកខានដំណឹង" : "Opens fast like a real app, never miss news"}</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {perks.map((p) => (
            <span key={p.en} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-white/20", p.c)}>
              <p.Icon size={13} /> {km ? p.km : p.en}
            </span>
          ))}
        </div>
        {/* progress through the 2 steps */}
        <div className="relative mt-4 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-all duration-700" style={{ width: `${(steps / 2) * 100}%` }} />
          </div>
          <span className="text-xs font-extrabold text-white/90">{km ? `${["០", "១", "២"][steps]}/២ ជំហាន` : `${steps}/2 steps`}</span>
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {/* 1. install */}
        <div className={cn("rounded-2xl p-3.5 ring-1 transition", installed ? "bg-emerald-50 ring-emerald-200" : "bg-[#F5F7FF] ring-[#DBE4FF]")}>
          <div className="flex items-center gap-3">
            <Num n={1} done={installed} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold text-forest">{km ? "ដំឡើងលើអេក្រង់ដើម" : "Add to the home screen"}</p>
              <p className="text-xs text-ink/55">{installed ? (km ? "រួចរាល់ · បើកពី icon លើអេក្រង់ដើម" : "Done · open it from the home-screen icon") : km ? "ចុចម្តង វានឹងលេចជា icon ដូចកម្មវិធីផ្សេងៗ" : "One tap and it appears as an icon like any app"}</p>
            </div>
            {installed && <CheckCircle2 size={22} className="text-emerald-500" />}
          </div>
          {!installed &&
            (canPrompt ? (
              <button type="button" onClick={install} className="relative mt-3 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(79,70,229,.9)] transition active:scale-[.97]">
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 motion-safe:animate-[gwzShine_2.8s_ease-in-out_infinite]" />
                <Download size={19} /> {km ? "ដំឡើងលើទូរស័ព្ទនេះ" : "Install on this phone"}
              </button>
            ) : ios ? (
              <ol className="mt-3 grid gap-2">
                {[
                  { Icon: Share, km: "ចុចប៊ូតុង «ចែករំលែក» ខាងក្រោមក្នុង Safari", en: "Tap “Share” at the bottom of Safari" },
                  { Icon: SquarePlus, km: "ជ្រើស «Add to Home Screen»", en: "Choose “Add to Home Screen”" },
                  { Icon: Smartphone, km: "ចុច «Add» រួចបើកពី icon ថ្មី", en: "Tap “Add”, then open the new icon" },
                ].map((x, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink/75 ring-1 ring-black/5">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#1D4ED8]"><x.Icon size={17} /></span>
                    {km ? x.km : x.en}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink/75 ring-1 ring-black/5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-lg font-extrabold text-[#1D4ED8]">⋮</span>
                {km ? "ក្នុង Chrome ចុច ⋮ (ខាងលើស្តាំ) → «Install app» ឬ «Add to Home screen»" : "In Chrome tap ⋮ (top right) → “Install app” or “Add to Home screen”"}
              </div>
            ))}
        </div>

        {/* 2. notifications */}
        <div className={cn("rounded-2xl p-3.5 ring-1 transition", pushDone ? "bg-emerald-50 ring-emerald-200" : "bg-[#F5F7FF] ring-[#DBE4FF]")}>
          <div className="flex items-center gap-3">
            <Num n={2} done={pushDone} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold text-forest">{km ? "បើកការជូនដំណឹង" : "Turn on notifications"}</p>
              <p className="text-xs text-ink/55">{pushDone ? (km ? "បានបើក · ទូរស័ព្ទនឹងរោទ៍ពេលមានដំណឹង" : "On · your phone rings when something comes in") : km ? "រំលឹកវេន និង SOS នឹងលោតមកទូរស័ព្ទភ្លាមៗ" : "Shift reminders and SOS pop up on your phone"}</p>
            </div>
            {pushDone ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Bell size={22} className="origin-top text-[#7C3AED] motion-safe:animate-[gwzRing_2s_ease-in-out_infinite]" />}
          </div>
          {pushDone ? (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={test} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE] transition active:scale-95">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {km ? "ផ្ញើសារសាកល្បង" : "Send a test"}
              </button>
              <button type="button" onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-bold text-ink/45 ring-1 ring-black/10 transition hover:text-red-600">
                <BellOff size={15} /> {km ? "បិទ" : "Off"}
              </button>
            </div>
          ) : push === "needs-install" ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <Smartphone size={15} className="mt-0.5 flex-shrink-0" /> {km ? "នៅលើ iPhone ត្រូវដំឡើងកម្មវិធី (ជំហានទី ១) ហើយបើកពី icon លើអេក្រង់ដើមជាមុនសិន ទើបអាចបើកការជូនដំណឹងបាន (iOS 16.4 ឡើង)។" : "On iPhone, install the app (step 1) and open it from the home-screen icon first, then turn on notifications (iOS 16.4+)."}
            </p>
          ) : push === "denied" ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">{km ? "ការជូនដំណឹងត្រូវបានបិទក្នុងការកំណត់ទូរស័ព្ទ។ សូមបើក «Notifications» សម្រាប់ website/កម្មវិធីនេះក្នុងការកំណត់ ហើយចូលម្តងទៀត។" : "Notifications are blocked in the phone settings. Allow “Notifications” for this site/app in the settings, then come back."}</p>
          ) : push === "unsupported" ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-ink/60 ring-1 ring-black/5">{km ? "កម្មវិធីរុករកនេះមិនគាំទ្រការជូនដំណឹងទេ។ សូមប្រើ Chrome (Android) ឬ Safari (iPhone)។" : "This browser can't show notifications. Use Chrome (Android) or Safari (iPhone)."}</p>
          ) : (
            <button type="button" onClick={turnOn} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#DB2777] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(190,24,93,.8)] transition active:scale-[.97] disabled:opacity-70">
              {busy ? <Loader2 size={19} className="animate-spin" /> : <Bell size={19} />} {km ? "បើកការជូនដំណឹង" : "Turn on notifications"}
            </button>
          )}
        </div>

        {msg && <p className="flex items-center gap-2 rounded-xl bg-[#EEF2FF] px-3 py-2.5 text-sm font-bold text-[#1D4ED8]"><CheckCircle2 size={16} /> {msg}</p>}
        {installed && pushDone && !compact && <p className="text-center text-sm font-extrabold text-emerald-600">🎉 {km ? "រួចរាល់ទាំងអស់! ទូរស័ព្ទរបស់អ្នករួចរាល់ហើយ" : "All set! Your phone is ready"}</p>}
      </div>
    </section>
  );
}
