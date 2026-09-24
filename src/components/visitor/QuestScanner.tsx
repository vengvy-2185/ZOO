"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Loader2, CameraOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { parseAnimalQr } from "@/lib/utils/animal-qr";

/**
 * Full-screen camera that looks for an animal QR sign. It only hands back a
 * token that came from a real sign (a /q/<token> link); the server then
 * checks the token and records the discovery.
 */
export function QuestScanner({ onToken, onClose, busy }: { onToken: (token: string) => void; onClose: () => void; busy: boolean }) {
  const { t } = useI18n();
  const q = t.quest;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOk, setCameraOk] = useState(true);
  const [wrong, setWrong] = useState(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let lastWrong = "";
    const Detector = (window as any).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    const tick = async () => {
      if (!active) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && !busyRef.current) {
        let text: string | null = null;
        try {
          if (detector) {
            text = (await detector.detect(v))[0]?.rawValue ?? null;
          } else {
            const c = canvasRef.current!;
            const w = 640;
            const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
        } catch {
          /* try the next frame */
        }
        if (text) {
          const token = parseAnimalQr(text);
          if (token) {
            navigator.vibrate?.(60);
            onTokenRef.current(token);
          } else if (text !== lastWrong) {
            // Some other QR (a ticket, a website): say so, keep scanning.
            lastWrong = text;
            setWrong(true);
            setTimeout(() => setWrong(false), 2500);
          }
        }
      }
      timer = setTimeout(tick, 200);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!active) return stream.getTracks().forEach((tr) => tr.stop());
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();
        tick();
      } catch {
        setCameraOk(false);
      }
    })();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0B1F14] text-white animate-[gwzFade_.2s_ease]" role="dialog" aria-label={q.scanTitle}>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-display text-lg font-extrabold">{q.scanTitle}</p>
        <button onClick={onClose} aria-label={q.close} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X size={20} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-8">
        <div className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-[2rem] bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {cameraOk ? (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative aspect-square w-[70%]">
                  {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                    <span key={c} className={`absolute h-12 w-12 border-leaf ${c}`} />
                  ))}
                  <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse rounded-full bg-leaf/80 shadow-[0_0_14px_#A3E635]" />
                </div>
              </div>
              <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/50 px-4 py-2.5 text-center text-sm font-semibold backdrop-blur">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> {q.checking}
                  </span>
                ) : wrong ? (
                  <span className="text-amber-300">{q.invalid}</span>
                ) : (
                  q.scanHint
                )}
              </p>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <CameraOff size={40} className="text-white/60" />
              <p className="text-sm text-white/80">{q.noCamera}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
