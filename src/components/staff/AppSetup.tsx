"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Download, Share, SquarePlus, CheckCircle2, Loader2, X, Send, Smartphone, AlarmClock, Siren, LifeBuoy, CalendarRange, Ticket, BarChart3, ShieldAlert, Map as MapIcon, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Push = "unsupported" | "needs-install" | "denied" | "off" | "on";
type Variant = "staff" | "admin" | "visitor";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

// each kind of user gets its own app (name, icon, colours, what it brings)
const LOOK: Record<Variant, { name: string; icon: string; hero: string; button: string; perks: { Icon: typeof Bell; km: string; en: string }[] }> = {
  staff: {
    name: "GWZ បុគ្គលិក",
    icon: "/icons/staff-maskable-512.png",
    hero: "from-[#1E3A8A] via-[#2563EB] to-[#7C3AED]",
    button: "from-[#2563EB] to-[#7C3AED] shadow-[0_12px_28px_-10px_rgba(79,70,229,.9)]",
    perks: [
      { Icon: AlarmClock, km: "រំលឹកវេន", en: "Shift reminders" },
      { Icon: Siren, km: "SOS ភ្លាមៗ", en: "Instant SOS" },
      { Icon: LifeBuoy, km: "សំណើជំនួស", en: "Cover requests" },
      { Icon: CalendarRange, km: "កាលវិភាគថ្មី", en: "Schedule changes" },
    ],
  },
  admin: {
    name: "GWZ Admin",
    icon: "/icons/maskable-512.png",
    hero: "from-[#0E3F24] via-[#176B3A] to-[#0E7C9C]",
    button: "from-[#176B3A] to-[#0E7C9C] shadow-[0_12px_28px_-10px_rgba(14,124,156,.9)]",
    perks: [
      { Icon: Siren, km: "SOS ភ្លាមៗ", en: "Instant SOS" },
      { Icon: ShieldAlert, km: "សំណើរង់ចាំអនុម័ត", en: "Requests to approve" },
      { Icon: BarChart3, km: "ថ្ងៃនេះនៅសួនសត្វ", en: "Today at the zoo" },
    ],
  },
  visitor: {
    name: "Green Wild Zoo",
    icon: "/icons/maskable-512.png",
    hero: "from-[#176B3A] via-[#2E8B57] to-[#F59E0B]",
    button: "from-[#176B3A] to-[#F59E0B] shadow-[0_12px_28px_-10px_rgba(245,158,11,.8)]",
    perks: [
      { Icon: Ticket, km: "សំបុត្រនៅក្នុងទូរស័ព្ទ", en: "Tickets on your phone" },
      { Icon: MapIcon, km: "ផែនទីសួនសត្វ", en: "Zoo map" },
      { Icon: Bell, km: "ដំណឹងពេលបង់ប្រាក់រួច", en: "Payment confirmed" },
    ],
  },
};

/**
 * One button: puts the site on the phone's home screen as an app AND turns
 * on notifications, in one tap. For staff, admins and visitors alike.
 * `compact`: hides itself once everything is set up (and can be closed).
 */
export function AppSetup({ km, compact = false, variant = "staff", signedIn = true }: { km: boolean; compact?: boolean; variant?: Variant; signedIn?: boolean }) {
  const look = LOOK[variant];
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
    const done = () => setInstalled(true);
    addEventListener("gwz-install-ready", ready);
    addEventListener("appinstalled", done);
    try {
      setHidden(localStorage.getItem(`gwz-appsetup-hide-${variant}`) === "1");
    } catch {}
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setPush(isIos && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setPush("denied");
      const reg = await navigator.serviceWorker.ready;
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
    return () => {
      removeEventListener("gwz-install-ready", ready);
      removeEventListener("appinstalled", done);
    };
  }, [variant]);

  /** Notifications on (only for someone signed in: the phone is linked to them). */
  const notificationsOn = async () => {
    if (push === "on") return true;
    if (!signedIn || push === "unsupported" || push === "needs-install" || push === "denied") return false;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setPush(perm === "denied" ? "denied" : "off");
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const { key } = await fetch("/api/push").then((r) => r.json());
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (!r.ok) return false;
    setPush("on");
    await fetch("/api/push", { method: "PUT" });
    return true;
  };

  /** The one button: install (where the browser can) and turn on notifications. */
  const setUp = async () => {
    setBusy(true);
    setMsg("");
    try {
      let didInstall = installed;
      const offer = (window as any).__gwzInstall;
      if (!installed && offer) {
        offer.prompt();
        const r = await offer.userChoice.catch(() => null);
        (window as any).__gwzInstall = null;
        setCanPrompt(false);
        didInstall = r?.outcome === "accepted";
        if (didInstall) setInstalled(true);
      }
      const on = await notificationsOn().catch(() => false);
      setMsg(
        didInstall && on
          ? km ? "រួចរាល់! កម្មវិធីនៅលើអេក្រង់ដើម ហើយការជូនដំណឹងបានបើក។" : "Done! The app is on your home screen and notifications are on."
          : on
            ? km ? "ការជូនដំណឹងបានបើក ✓" : "Notifications are on ✓"
            : didInstall
              ? km ? "បានដំឡើងកម្មវិធី ✓" : "App installed ✓"
              : ""
      );
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

  // everything this phone can do is done
  const pushOk = push === "on" || !signedIn || push === "unsupported";
  const allSet = installed && pushOk;
  if (compact && (allSet || hidden)) return null;

  return (
    <section className={cn("relative overflow-hidden rounded-[1.75rem] bg-white shadow-lift ring-1 ring-black/5", compact && "animate-[gwzPop_.4s_ease-out_both]")}>
      <div className={cn("relative overflow-hidden bg-gradient-to-br px-5 pb-5 pt-5 text-white", look.hero)}>
        <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        {compact && (
          <button
            type="button"
            aria-label={km ? "បិទ" : "Hide"}
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem(`gwz-appsetup-hide-${variant}`, "1");
              } catch {}
            }}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
          >
            <X size={16} />
          </button>
        )}
        <div className="relative flex items-center gap-4">
          <span className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.icon} alt="" className="h-[72px] w-[72px] rounded-[22px] shadow-[0_10px_25px_-8px_rgba(0,0,0,.55)] ring-2 ring-white/40" />
            {!allSet && <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-extrabold ring-2 ring-white motion-safe:animate-bounce">1</span>}
          </span>
          <div className="min-w-0 pr-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">{km ? "កម្មវិធីសម្រាប់ទូរស័ព្ទ" : "Phone app"}</p>
            <h2 className="font-display text-xl font-extrabold leading-tight md:text-2xl">{look.name}</h2>
            <p className="mt-0.5 text-sm text-white/90">{km ? "ចុចម្តង៖ ដំឡើងលើអេក្រង់ដើម និងបើកការជូនដំណឹង" : "One tap: on your home screen, with notifications"}</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {look.perks.map((p) => (
            <span key={p.en} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold ring-1 ring-white/20">
              <p.Icon size={13} /> {km ? p.km : p.en}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {allSet ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <PartyPopper size={22} className="text-emerald-600" />
            <p className="flex-1 text-sm font-extrabold text-emerald-700">{km ? "រួចរាល់! កម្មវិធីនៅលើទូរស័ព្ទ ហើយការជូនដំណឹងបានបើក" : "All set! The app is on your phone with notifications on"}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={setUp}
            disabled={busy}
            className={cn("relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r py-4 text-lg font-extrabold text-white transition active:scale-[.97] disabled:opacity-80", look.button)}
          >
            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 motion-safe:animate-[gwzShine_2.8s_ease-in-out_infinite]" />
            {busy ? <Loader2 size={22} className="animate-spin" /> : installed ? <Bell size={22} /> : <Download size={22} />}
            {installed ? (km ? "បើកការជូនដំណឹង" : "Turn on notifications") : km ? "ដំឡើងកម្មវិធី" : "Install the app"}
          </button>
        )}

        {/* what happens / what is left, in one short line */}
        {!allSet && (
          <p className="flex items-start gap-2 text-xs font-semibold text-ink/55">
            <Smartphone size={15} className="mt-0.5 flex-shrink-0 text-ink/40" />
            {push === "denied"
              ? km ? "ការជូនដំណឹងត្រូវបានបិទក្នុងការកំណត់ទូរស័ព្ទ។ បើក «Notifications» សម្រាប់ website នេះ ហើយចុចម្តងទៀត។" : "Notifications are blocked in the phone settings. Allow them for this site and tap again."
              : !signedIn
                ? km ? "ចូលគណនីជាមុនសិន ដើម្បីទទួលការជូនដំណឹងអំពីសំបុត្ររបស់អ្នក។" : "Sign in first to get notifications about your tickets."
                : ios && !installed
                  ? km ? "នៅលើ iPhone ដំឡើងតាមជំហានខាងក្រោម រួចបើកកម្មវិធី ហើយចុចប៊ូតុងម្តងទៀតសម្រាប់ការជូនដំណឹង។" : "On iPhone, install with the steps below, open the app, then tap the button again for notifications."
                  : !installed && !canPrompt
                    ? km ? "បើមិនឃើញផ្ទាំងដំឡើង៖ ក្នុង Chrome ចុច ⋮ → «Install app»។" : "If no install window appears: in Chrome tap ⋮ → “Install app”."
                    : km ? "ទូរស័ព្ទនឹងសួរ៖ «Install» និង «Allow notifications» — សូមចុចយល់ព្រមទាំងពីរ។" : "Your phone asks: “Install” and “Allow notifications” — accept both."}
          </p>
        )}

        {/* iPhone: installing is done from Safari's Share menu */}
        {ios && !installed && (
          <ol className="grid gap-2">
            {[
              { Icon: Share, km: "ចុចប៊ូតុង «ចែករំលែក» ខាងក្រោមក្នុង Safari", en: "Tap “Share” at the bottom of Safari" },
              { Icon: SquarePlus, km: "ជ្រើស «Add to Home Screen» ហើយចុច «Add»", en: "Choose “Add to Home Screen”, then “Add”" },
              { Icon: Bell, km: "បើកកម្មវិធីពី icon ថ្មី ហើយចុចប៊ូតុងខាងលើ", en: "Open the new icon and tap the button above" },
            ].map((x, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-[#F5F7FF] px-3 py-2.5 text-sm font-semibold text-ink/75 ring-1 ring-[#DBE4FF]">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#1D4ED8] ring-1 ring-black/5"><x.Icon size={17} /></span>
                {km ? x.km : x.en}
              </li>
            ))}
          </ol>
        )}

        {push === "on" && !compact && (
          <div className="flex gap-2">
            <button type="button" onClick={test} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-bold text-[#1D4ED8] ring-1 ring-[#BFDBFE] transition active:scale-95">
              <Send size={15} /> {km ? "ផ្ញើសារសាកល្បង" : "Send a test"}
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-bold text-ink/45 ring-1 ring-black/10 transition hover:text-red-600">
              <BellOff size={15} /> {km ? "បិទការជូនដំណឹង" : "Turn off"}
            </button>
          </div>
        )}
        {msg && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> {msg}</p>}
      </div>
    </section>
  );
}
