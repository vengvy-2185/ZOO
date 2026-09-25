"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, MapPinOff, RotateCcw, ScanLine } from "lucide-react";
import { checkInAttendance, type CheckInResult } from "@/app/staff/(protected)/attendance-actions";
import { cn } from "@/lib/utils/cn";

type Fix = { lat: number; lng: number; accuracy: number };
type Step = "locating" | "no-location" | "scanning" | "sending" | "done";

/**
 * Staff check-in on their own phone: 1) share location, 2) scan the QR on
 * the zoo's screen (or arrive here from the phone camera with the code in
 * the address), 3) see "on time" / "late N min".
 */
export function CheckInScanner({ km, initialToken }: { km: boolean; initialToken?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("locating");
  const [fix, setFix] = useState<Fix | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);

  const L = km
    ? { locating: "កំពុងស្វែងរកទីតាំងរបស់អ្នក…", noLoc: "សូមបើកទីតាំង (Location)", noLocText: "ការកត់វត្តមានត្រូវការដឹងថាអ្នកនៅក្នុងសួនសត្វ។ បើក Location ក្នុងការកំណត់ទូរស័ព្ទ ហើយអនុញ្ញាតឲ្យវេបសាយនេះប្រើ រួចចុចព្យាយាមម្តងទៀត។", retry: "ព្យាយាមម្តងទៀត", point: "តម្រង់កាមេរ៉ាទៅ QR នៅលើអេក្រង់", locOk: "ទីតាំងរួចរាល់", acc: "ភាពត្រឹមត្រូវ", sending: "កំពុងកត់វត្តមាន…", morning: "វេនព្រឹក", afternoon: "វេនរសៀល", onTime: "មកទាន់ម៉ោង", late: (m: number) => `មកយឺត ${m} នាទី`, already: "បានកត់វត្តមានរួចហើយ", at: "ម៉ោង", again: "ស្កេនម្តងទៀត", home: "ត្រឡប់ទំព័រដើម", errors: { signin: "សូមចូលគណនីជាមុនសិន។", "not-staff": "គណនីនេះមិនមែនជាបុគ្គលិកសកម្មទេ។", qr: "QR ផុតកំណត់ ឬមិនត្រឹមត្រូវ។ សូមស្កេន QR ថ្មីនៅលើអេក្រង់។", location: "មិនមានទីតាំង។ សូមបើក Location។", far: "អ្នកនៅឆ្ងាយពីសួនសត្វពេក។", closed: "ឥឡូវមិនមែនម៉ោងកត់វត្តមានទេ។" } as Record<string, string>, meters: "ម៉ែត្រ" }
    : { locating: "Finding your location…", noLoc: "Please turn on Location", noLocText: "Checking in needs to know you are at the zoo. Turn on Location in your phone settings and allow this site, then try again.", retry: "Try again", point: "Point the camera at the QR on the screen", locOk: "Location ready", acc: "accuracy", sending: "Checking you in…", morning: "Morning", afternoon: "Afternoon", onTime: "On time", late: (m: number) => `Late by ${m} min`, already: "Already checked in", at: "at", again: "Scan again", home: "Back to home", errors: { signin: "Please sign in first.", "not-staff": "This isn't an active staff account.", qr: "This QR has expired or isn't valid. Scan the new one on the screen.", location: "No location. Please turn on Location.", far: "You are too far from the zoo.", closed: "Check-in isn't open right now." } as Record<string, string>, meters: "m" };

  const locate = useCallback(() => {
    setStep("locating");
    if (!navigator.geolocation) return setStep("no-location");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setStep("scanning");
      },
      () => setStep("no-location"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);
  useEffect(locate, [locate]);

  const submit = useCallback(
    async (token: string) => {
      if (busy.current) return;
      busy.current = true;
      setStep("sending");
      const r = await checkInAttendance(token, fix?.lat ?? null, fix?.lng ?? null, fix?.accuracy ?? null).catch(() => ({ ok: false as const, error: "qr" as const }));
      setResult(r);
      setStep("done");
      try {
        navigator.vibrate?.(r.ok ? 80 : [120, 60, 120]);
      } catch {}
      busy.current = false;
    },
    [fix]
  );

  // arrived from the phone camera with the code in the address: send it once located
  useEffect(() => {
    if (step === "scanning" && initialToken && !result) submit(initialToken);
  }, [step, initialToken, result, submit]);

  // camera scanning loop
  useEffect(() => {
    if (step !== "scanning" || initialToken) return;
    let stream: MediaStream | null = null;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const Detector = (window as any).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
    const tick = async () => {
      if (!alive) return;
      const v = video.current;
      if (v && v.readyState >= 2) {
        let text: string | null = null;
        try {
          if (detector) text = (await detector.detect(v))[0]?.rawValue ?? null;
          else {
            const c = canvas.current!;
            c.width = 480;
            c.height = Math.round((v.videoHeight / v.videoWidth) * 480) || 360;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, c.width, c.height);
            text = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
          }
        } catch {}
        if (text) {
          let t = text;
          try {
            t = new URL(text).searchParams.get("t") ?? text;
          } catch {}
          if (/^\d+\.[\w-]{22}$/.test(t)) return submit(t);
        }
      }
      timer = setTimeout(tick, 200);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        video.current!.srcObject = stream;
        await video.current!.play();
        tick();
      } catch {}
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [step, initialToken, submit]);

  return (
    <div className="mx-auto max-w-md">
      {step === "locating" && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1D4ED8]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#93C5FD]/40" />
            <MapPin size={28} className="relative" />
          </span>
          <p className="font-bold text-forest">{L.locating}</p>
        </div>
      )}

      {step === "no-location" && (
        <div className="card p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600"><MapPinOff size={30} /></span>
          <p className="mt-3 font-display text-xl font-extrabold text-forest">{L.noLoc}</p>
          <p className="mt-1 text-sm text-ink/60">{L.noLocText}</p>
          <button onClick={locate} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] py-3 font-bold text-white"><RotateCcw size={16} /> {L.retry}</button>
        </div>
      )}

      {(step === "scanning" || step === "sending") && (
        <div className="overflow-hidden rounded-[2rem] bg-[#0B1433] text-white shadow-lift">
          <div className="relative aspect-square bg-black">
            {!initialToken && <video ref={video} muted playsInline className="h-full w-full object-cover" />}
            <canvas ref={canvas} className="hidden" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[68%] w-[68%]">
                {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                  <span key={c} className={cn("absolute h-10 w-10 border-[#93C5FD]", c)} />
                ))}
                <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-[#93C5FD]" />
              </div>
            </div>
            {step === "sending" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                <Loader2 size={44} className="animate-spin text-[#93C5FD]" />
                <p className="font-bold">{L.sending}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5 font-bold"><ScanLine size={16} className="text-[#93C5FD]" /> {L.point}</span>
          </div>
          {fix && (
            <p className="flex items-center gap-1.5 border-t border-white/10 px-4 py-2 text-xs text-white/60">
              <MapPin size={13} className="text-emerald-400" /> {L.locOk} · {L.acc} ±{Math.round(fix.accuracy)} {L.meters}
            </p>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className={cn("overflow-hidden rounded-[2rem] text-center text-white shadow-lift", result.ok ? (result.late > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-emerald-500 to-emerald-700") : "bg-gradient-to-br from-red-600 to-rose-700")}>
          <div className="p-7">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 animate-[gwzPop_.3s_ease]">
              {result.ok ? result.late > 0 ? <Clock size={44} /> : <CheckCircle2 size={44} /> : <AlertTriangle size={44} />}
            </span>
            {result.ok ? (
              <>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-white/75">{result.session === "morning" ? L.morning : L.afternoon}</p>
                <p className="font-display text-3xl font-extrabold">{result.already ? L.already : result.late > 0 ? L.late(result.late) : L.onTime}</p>
                <p className="mt-1 text-lg font-bold text-white/90">{L.at} {result.time}</p>
                {result.distance != null && <p className="mt-1 text-xs text-white/70"><MapPin size={11} className="-mt-0.5 inline" /> {result.distance} {L.meters}</p>}
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-2xl font-extrabold">{L.errors[result.error]}</p>
                {result.error === "far" && result.distance != null && (
                  <p className="mt-1 text-sm text-white/80">{result.distance} {L.meters} / {result.radius} {L.meters}</p>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/20">
            <button
              onClick={() => {
                setResult(null);
                if (initialToken) router.replace("/staff/checkin");
                locate();
              }}
              className="bg-black/10 py-3.5 text-sm font-bold hover:bg-black/20"
            >
              {L.again}
            </button>
            <button onClick={() => router.push("/staff")} className="bg-black/10 py-3.5 text-sm font-bold hover:bg-black/20">{L.home}</button>
          </div>
        </div>
      )}
    </div>
  );
}
