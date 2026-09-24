"use client";

import QRCode from "qrcode";

/** "khqr" = the standard red KHQR mark with the currency sign; anything else is an image URL. */
export type KhqrLogo = "khqr" | string;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Supabase Storage allows it; keeps the canvas saveable
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Draws the KHQR with a round logo in the middle and returns a PNG data URL
 * (so "Save QR" keeps the logo). Error correction H lets every banking app
 * read the code even with the centre covered.
 */
export async function drawKhqr(qr: string, logo: KhqrLogo = "/icon.svg", currency = "USD"): Promise<string> {
  const size = 640;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  await QRCode.toCanvas(c, qr, { errorCorrectionLevel: "H", margin: 1, width: size, color: { dark: "#000000", light: "#ffffff" } });
  const ctx = c.getContext("2d")!;
  const mid = size / 2;
  const r = size * 0.095;

  // white ring so the logo stands apart from the modules
  ctx.beginPath();
  ctx.arc(mid, mid, r + size * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const khqrMark = () => {
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.fillStyle = "#E1232E";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // the riel sign is a short glyph, so it is drawn larger than the dollar sign
    const riel = currency === "KHR";
    ctx.font = `800 ${Math.round(r * (riel ? 2.1 : 1.25))}px "Kantumruy Pro", "Noto Sans Khmer", "Khmer OS", "Leelawadee UI", Arial, sans-serif`;
    ctx.fillText(riel ? "៛" : "$", mid, mid + r * (riel ? 0.12 : 0.06));
  };

  if (logo === "khqr") {
    khqrMark();
  } else {
    try {
      const img = await loadImage(logo);
      ctx.save();
      ctx.beginPath();
      ctx.arc(mid, mid, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mid - r, mid - r, r * 2, r * 2);
      // "cover" fit into the circle
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      const s = Math.max((r * 2) / w, (r * 2) / h);
      ctx.drawImage(img, mid - (w * s) / 2, mid - (h * s) / 2, w * s, h * s);
      ctx.restore();
    } catch {
      khqrMark(); // logo couldn't load: fall back to the standard mark
    }
  }
  return c.toDataURL("image/png");
}

function money(amount: number, currency: string) {
  return currency === "KHR" ? amount.toLocaleString("en-US") : amount.toFixed(2);
}

/**
 * The card around the QR, styled after the official KHQR layout: red
 * header with the cut corner, receiver name, amount, dashed tear line.
 */
export function KhqrCard({
  merchant,
  amount,
  currency,
  children,
  footer,
}: {
  merchant: string;
  amount?: number;
  currency?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] bg-white shadow-lift ring-1 ring-black/5">
      <div className="relative flex h-[3.6rem] items-center justify-center bg-[#E1232E]">
        <span className="font-sans text-[1.7rem] font-black tracking-[0.12em] text-white">KHQR</span>
        {/* the official card's diagonal cut on the right of the header */}
        <span className="absolute bottom-0 right-0 h-[1.9rem] w-[2.4rem] bg-white [clip-path:polygon(100%_0,0_100%,100%_100%)]" />
      </div>
      <div className="px-6 pb-3 pt-4">
        <div className="truncate text-[13px] font-bold uppercase tracking-wide text-ink/70">{merchant}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-sans text-[2rem] font-black leading-none text-ink">{amount != null && currency ? money(amount, currency) : "—"}</span>
          {currency && <span className="text-sm font-bold text-ink/55">{currency === "KHR" ? "KHR" : "USD"}</span>}
        </div>
      </div>
      <div className="relative">
        <div className="mx-4 border-t-2 border-dashed border-black/15" />
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-[#F4F7F2] ring-1 ring-black/5" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-[#F4F7F2] ring-1 ring-black/5" />
      </div>
      <div className="p-5">{children}</div>
      {footer}
    </div>
  );
}
