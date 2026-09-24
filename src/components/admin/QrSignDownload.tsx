"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";
import { LOGO_SVG } from "@/components/visitor/logo-svg";

const W = 1240; // ~A6 at 300 dpi (10.5 x 14.8 cm)
const H = 1748;

function loadImage(src: string, cors = false) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.8, size * 0.5, 0, size);
  ctx.bezierCurveTo(-size * 0.8, size * 0.5, -size * 0.8, -size * 0.5, 0, -size);
  ctx.fill();
  ctx.restore();
}

/**
 * Downloads a print-ready sign for an enclosure: the zoo logo and name, the
 * animal's photo and names, and its Animal Quest QR (with the logo in the
 * middle) inside a jungle frame.
 */
export function QrSignDownload({
  url,
  code,
  name,
  nameKm,
  species,
  speciesKm,
  image,
  label = "Download sign",
  className,
}: {
  url: string;
  code: string;
  name: string;
  nameKm: string | null;
  species: string | null;
  speciesKm: string | null;
  image: string | null;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true);
    try {
      await document.fonts?.ready;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;

      // jungle frame
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#0E3F24");
      g.addColorStop(0.55, "#2E8B57");
      g.addColorStop(1, "#0E3F24");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const leaves: [number, number, number, number, string][] = [
        [70, 90, 70, -0.6, "#9BD13B"], [170, 60, 50, 0.4, "#6BAE4E"], [W - 80, 100, 75, 0.7, "#9BD13B"], [W - 190, 55, 48, -0.3, "#6BAE4E"],
        [60, H - 110, 72, 0.5, "#9BD13B"], [175, H - 60, 50, -0.5, "#6BAE4E"], [W - 70, H - 120, 70, -0.6, "#9BD13B"], [W - 185, H - 58, 50, 0.3, "#6BAE4E"],
        [40, H / 2, 55, 0.2, "#6BAE4E"], [W - 40, H / 2 - 120, 55, -0.2, "#6BAE4E"],
      ];
      leaves.forEach(([x, y, s, a, col]) => leaf(ctx, x, y, s, a, col));

      // card
      const M = 70;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 40;
      ctx.fillStyle = "#FFFBF1";
      ctx.beginPath();
      ctx.roundRect(M, M, W - M * 2, H - M * 2, 60);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#9BD13B";
      ctx.lineWidth = 6;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.roundRect(M + 22, M + 22, W - M * 2 - 44, H - M * 2 - 44, 44);
      ctx.stroke();
      ctx.setLineDash([]);

      // header: logo + zoo name
      const logo = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG));
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `800 64px "Baloo 2", system-ui, sans-serif`;
      const title = "GREEN WILD ZOO";
      const tw = ctx.measureText(title).width;
      const lx = (W - (110 + 24 + tw)) / 2;
      if (logo) ctx.drawImage(logo, lx, 150, 110, 110);
      ctx.fillStyle = "#0E3F24";
      ctx.fillText("GREEN WILD ", lx + 134, 192);
      ctx.fillStyle = "#2E8B57";
      ctx.fillText("ZOO", lx + 134 + ctx.measureText("GREEN WILD ").width, 192);
      ctx.fillStyle = "#6b7a6f";
      ctx.font = `600 28px "Battambang", "Inter", system-ui, sans-serif`;
      ctx.fillText("ធម្មជាតិ សត្វ និងមិត្តភាព  |  Nature, Animals, Together", lx + 136, 240);

      // animal photo
      const photo = image ? await loadImage(image, true) : null;
      const cx = W / 2;
      const pr = 150;
      const py = 470;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, py, pr + 14, 0, Math.PI * 2);
      ctx.fillStyle = "#9BD13B";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, py, pr, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#cfe3d4";
      ctx.fillRect(cx - pr, py - pr, pr * 2, pr * 2);
      if (photo) {
        const s = Math.max((pr * 2) / photo.naturalWidth, (pr * 2) / photo.naturalHeight);
        ctx.drawImage(photo, cx - (photo.naturalWidth * s) / 2, py - (photo.naturalHeight * s) / 2, photo.naturalWidth * s, photo.naturalHeight * s);
      }
      ctx.restore();

      // names
      ctx.textAlign = "center";
      ctx.fillStyle = "#0E3F24";
      ctx.font = `700 76px "Battambang", "Baloo 2", system-ui, sans-serif`;
      ctx.fillText(nameKm || name, cx, 715);
      ctx.fillStyle = "#2E8B57";
      ctx.font = `800 44px "Baloo 2", system-ui, sans-serif`;
      const sub = [nameKm ? name : null, species].filter(Boolean).join("  |  ");
      if (sub) ctx.fillText(sub, cx, 795);
      if (speciesKm) {
        ctx.fillStyle = "#6b7a6f";
        ctx.font = `600 32px "Battambang", system-ui, sans-serif`;
        ctx.fillText(speciesKm, cx, 850);
      }

      // QR with the logo in the middle (high error correction keeps it scannable)
      const qrSize = 560;
      const qx = cx - qrSize / 2;
      const qy = 900;
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, url, { errorCorrectionLevel: "H", margin: 1, width: qrSize, color: { dark: "#0E3F24", light: "#FFFFFF" } });
      ctx.save();
      ctx.shadowColor = "rgba(14,63,36,0.25)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(qx - 26, qy - 26, qrSize + 52, qrSize + 52, 40);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);
      const ls = 120;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(cx - ls / 2 - 10, qy + qrSize / 2 - ls / 2 - 10, ls + 20, ls + 20, 28);
      ctx.fill();
      if (logo) ctx.drawImage(logo, cx - ls / 2, qy + qrSize / 2 - ls / 2, ls, ls);

      // call to action
      ctx.fillStyle = "#2E8B57";
      ctx.beginPath();
      ctx.roundRect(cx - 440, 1512, 880, 90, 45);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `700 38px "Battambang", "Baloo 2", system-ui, sans-serif`;
      ctx.fillText("ស្កេនដើម្បីប្រមូលសត្វ  |  Scan to collect", cx, 1559);
      ctx.fillStyle = "#6b7a6f";
      ctx.font = `600 26px "Inter", system-ui, sans-serif`;
      ctx.fillText(`${new URL(url).host}   ${code}`, cx, 1632);

      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = `${code}-sign.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={make} disabled={busy} className={className ?? "btn-primary w-full py-2 text-xs"}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {label}
    </button>
  );
}
