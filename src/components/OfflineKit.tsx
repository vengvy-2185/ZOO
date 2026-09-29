"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiOff, CloudUpload, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { flush, pendingOps, onQueueChange, syncLog, markLogSeen, clearLog, isFlushing, currentUser, type LogEntry } from "@/lib/offline/queue";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Works quietly on every page:
 * - installs the service worker (pages and files kept on the device);
 * - sends work that waited on the device as soon as the internet is back;
 * - shows a small pill: offline, how much is waiting, "all sent", or any
 *   problem found when it was sent (tap to see).
 */
export function OfflineKit() {
  const { locale } = useI18n();
  const km = locale === "km";
  const path = usePathname();
  const [online, setOnline] = useState(true);
  const [cachedPage, setCachedPage] = useState(false);
  const fromCache = useRef(false);
  useEffect(() => {
    fromCache.current = cachedPage;
  }, [cachedPage]);
  const [waiting, setWaiting] = useState(0);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [healed, setHealed] = useState(false);

  // the page reloaded itself after an error: say so, in case something typed was lost
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gwz-healed")) {
        sessionStorage.removeItem("gwz-healed");
        setHealed(true);
        const t = setTimeout(() => setHealed(false), 7000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // the service worker (production only: in development it would keep old files)
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "was-cached" && e.data.url === location.href) setCachedPage(Boolean(e.data.cached));
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: "was-cached", url: location.href })).catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  // pages from the signed-in areas belong to one person: tell the worker who it is
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !/^\/(staff|admin|account|my-tickets)/.test(path)) return;
    currentUser().then((id) => {
      if (id) navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: "owner", id })).catch(() => {});
    });
  }, [path]);

  useEffect(() => {
    let prevWaiting = 0;
    const refresh = async () => {
      const n = (await pendingOps()).length;
      setWaiting(n);
      setSending(isFlushing());
      if (prevWaiting > 0 && n === 0) {
        setJustSent(true);
        setTimeout(() => setJustSent(false), 3500);
      }
      prevWaiting = n;
      setLog((await syncLog()).filter((e) => !e.seen));
    };
    const net = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        void flush();
        // a page shown from the saved copy may be from an older version: load the fresh one
        // (unless the person is typing something)
        if (fromCache.current) {
          const el = document.activeElement as HTMLInputElement | null;
          const typing = el && /INPUT|TEXTAREA/.test(el.tagName) && el.value;
          if (!typing) setTimeout(() => location.reload(), 800);
        }
        setCachedPage(false);
      }
    };
    net();
    refresh();
    const off = onQueueChange(refresh);
    addEventListener("online", net);
    addEventListener("offline", net);
    // try again every 20 s while something waits (a flaky connection may not fire "online")
    const id = setInterval(() => {
      pendingOps().then((ops) => {
        if (ops.length && navigator.onLine) void flush();
      });
    }, 20000);
    const vis = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void flush();
    };
    document.addEventListener("visibilitychange", vis);
    void flush();
    return () => {
      off();
      clearInterval(id);
      removeEventListener("online", net);
      removeEventListener("offline", net);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  if (healed && online && !waiting && !log.length)
    return (
      <button type="button" onClick={() => setHealed(false)} className="fixed left-1/2 z-[70] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2 text-xs font-extrabold text-white shadow-lift" style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }} aria-live="polite">
        <CheckCircle2 size={15} className="flex-shrink-0" />
        <span className="truncate">{km ? "ទំព័រត្រូវបានផ្ទុកឡើងវិញ · បើអ្នកទើបបញ្ចូលអ្វីមួយ សូមបញ្ចូលម្តងទៀត" : "The page was refreshed · if you just entered something, please enter it again"}</span>
      </button>
    );
  const show = !online || cachedPage || waiting > 0 || justSent || log.length > 0;
  if (!show) return null;

  const problems = log.length;
  const tone = problems ? "bg-amber-500 text-white" : !online || cachedPage ? "bg-slate-800 text-white" : justSent && !waiting ? "bg-emerald-600 text-white" : "bg-[#1D4ED8] text-white";
  const text = problems
    ? km ? `មានបញ្ហា ${problems} ពេលបញ្ជូន · ចុចមើល` : `${problems} problem(s) when sending · tap to see`
    : !online
      ? km ? `គ្មាន internet${waiting ? ` · ${waiting} រង់ចាំបញ្ជូន` : " · កំពុងប្រើទិន្នន័យក្នុងឧបករណ៍"}` : `Offline${waiting ? ` · ${waiting} waiting to send` : " · using what's saved on this device"}`
      : cachedPage
        ? km ? "internet យឺត · កំពុងបង្ហាញទំព័រដែលរក្សាទុក" : "Slow internet · showing the saved page"
        : waiting
          ? km ? `កំពុងបញ្ជូន ${waiting}…` : `Sending ${waiting}…`
          : km ? "បានបញ្ជូនទាំងអស់ ✓" : "All sent ✓";
  const Icon = problems ? AlertTriangle : !online || cachedPage ? WifiOff : waiting ? CloudUpload : CheckCircle2;

  return (
    <>
      <button
        type="button"
        onClick={() => problems && setOpen(true)}
        className={cn("fixed left-1/2 z-[70] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold shadow-lift transition", tone, !problems && "cursor-default")}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        aria-live="polite"
      >
        <Icon size={15} className={cn("flex-shrink-0", (waiting > 0 || sending) && online && "animate-pulse")} />
        <span className="truncate">{text}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 text-ink shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-forest">{km ? "ការងារដែលបានបញ្ជូនពេលក្រោយ" : "Work sent later"}</h2>
              <button onClick={() => setOpen(false)} aria-label="close" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X size={18} /></button>
            </div>
            <p className="mb-3 text-sm text-ink/60">{km ? "ការងារខាងក្រោម ធ្វើឡើងពេលគ្មាន internet ហើយពេលបញ្ជូន server បានរកឃើញបញ្ហា។ សូមពិនិត្យ និងប្រាប់អ្នកគ្រប់គ្រង បើចាំបាច់។" : "These were done without internet, and the server found a problem when they were sent. Please check and tell a manager if needed."}</p>
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {log.map((e) => (
                <li key={e.id} className="rounded-2xl bg-amber-50 px-3 py-2.5 text-sm ring-1 ring-amber-200">
                  <p className="font-bold text-amber-900">{e.title || e.kind}</p>
                  {e.detail && <p className="text-xs text-amber-800/80">{e.detail}</p>}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={async () => { await markLogSeen(); setOpen(false); }} className="flex-1 rounded-2xl bg-[#1D4ED8] py-3 text-sm font-extrabold text-white">{km ? "បានឃើញហើយ" : "Got it"}</button>
              <button onClick={async () => { await clearLog(); setOpen(false); }} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-ink/60">{km ? "លុប" : "Clear"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
