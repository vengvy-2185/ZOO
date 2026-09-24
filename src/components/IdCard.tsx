"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, Loader2 } from "lucide-react";
import { CARD_STYLE, type CardType } from "@/lib/members";
import { LOGO_SVG } from "@/components/visitor/logo-svg";

// Real card size: CR80, 54 x 85.6 mm, drawn at about 300 dpi.
const W = 640;
const H = 1015;
const S = W / 280; // the layout below is designed on a 280 px wide card

export type IdCardData = { type: CardType; name: string; photo: string | null; memberNo: string; since: string; site: string; verifyUrl: string | null };

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

/** Photos from other sites go through our proxy so the card can be saved. */
function photoSrc(url: string | null) {
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith(window.location.origin)) return url;
  return `/api/avatar?u=${encodeURIComponent(url)}`;
}

function wrapName(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

async function drawCard(d: IdCardData): Promise<string> {
  await document.fonts?.ready;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const st = CARD_STYLE[d.type];
  const x = (n: number) => n * S;

  // card shape
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, x(18));
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // header
  const hg = ctx.createLinearGradient(0, 0, W, x(176));
  hg.addColorStop(0, st.from);
  hg.addColorStop(1, st.to);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, x(150));
  ctx.quadraticCurveTo(W / 2, x(196), 0, x(150));
  ctx.closePath();
  ctx.fill();
  // soft leaves
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.ellipse(x(250), x(40), x(46), x(26), -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x(22), x(110), x(34), x(18), 0.9, 0, Math.PI * 2);
  ctx.fill();

  // strap slot
  ctx.fillStyle = "#EEF2F0";
  ctx.beginPath();
  ctx.roundRect(W / 2 - x(36), x(13), x(72), x(12), x(6));
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = x(1);
  ctx.stroke();

  // logo + zoo name
  const logo = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG));
  ctx.textBaseline = "middle";
  ctx.font = `800 ${x(17)}px "Baloo 2", system-ui, sans-serif`;
  const title = "GREEN WILD ZOO";
  const tw = ctx.measureText(title).width;
  const lx = (W - (x(34) + x(8) + tw)) / 2;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(lx + x(17), x(52), x(19), 0, Math.PI * 2);
  ctx.fill();
  if (logo) ctx.drawImage(logo, lx, x(35), x(34), x(34));
  ctx.textAlign = "left";
  ctx.fillText(title, lx + x(42), x(47));
  ctx.fillStyle = st.ink;
  ctx.font = `700 ${x(8)}px "Inter", system-ui, sans-serif`;
  ctx.fillText("NATURE, ANIMALS, TOGETHER", lx + x(43), x(62));

  // photo
  const P = { x: W / 2 - x(66), y: x(86), s: x(132), r: x(30) };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = x(12);
  ctx.shadowOffsetY = x(4);
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(P.x, P.y, P.s, P.s, P.r);
  ctx.fill();
  ctx.restore();
  const inner = { x: P.x + x(5), y: P.y + x(5), s: P.s - x(10), r: P.r - x(5) };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(inner.x, inner.y, inner.s, inner.s, inner.r);
  ctx.clip();
  const pg = ctx.createLinearGradient(inner.x, inner.y, inner.x + inner.s, inner.y + inner.s);
  pg.addColorStop(0, st.to);
  pg.addColorStop(1, st.from);
  ctx.fillStyle = pg;
  ctx.fillRect(inner.x, inner.y, inner.s, inner.s);
  const src = photoSrc(d.photo);
  const photo = src ? await loadImg(src) : null;
  if (photo) {
    const k = Math.max(inner.s / photo.naturalWidth, inner.s / photo.naturalHeight);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo, inner.x + (inner.s - photo.naturalWidth * k) / 2, inner.y + (inner.s - photo.naturalHeight * k) / 2, photo.naturalWidth * k, photo.naturalHeight * k);
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = `800 ${x(56)}px "Baloo 2", "Battambang", sans-serif`;
    ctx.fillText([...d.name.trim()][0]?.toUpperCase() ?? "?", W / 2, inner.y + inner.s / 2 + x(4));
  }
  ctx.restore();

  // name
  ctx.textAlign = "center";
  ctx.fillStyle = "#0E3F24";
  ctx.font = `800 ${x(21)}px "Baloo 2", "Battambang", system-ui, sans-serif`;
  const lines = wrapName(ctx, d.name, W - x(36));
  lines.forEach((l, i) => ctx.fillText(l, W / 2, x(240) + i * x(24)));
  let y = x(240) + (lines.length - 1) * x(24) + x(28);

  // role pill
  ctx.font = `800 ${x(11)}px "Inter", system-ui, sans-serif`;
  const roleEn = st.en.toUpperCase();
  ctx.font = `600 ${x(10.5)}px "Battambang", sans-serif`;
  const pw = Math.max(ctx.measureText(st.km).width, (() => { ctx.font = `800 ${x(11)}px "Inter", system-ui, sans-serif`; return ctx.measureText(roleEn).width + roleEn.length * x(1.4); })()) + x(28);
  const rg = ctx.createLinearGradient(W / 2 - pw / 2, 0, W / 2 + pw / 2, 0);
  rg.addColorStop(0, st.from);
  rg.addColorStop(1, st.to);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.roundRect(W / 2 - pw / 2, y, pw, x(38), x(12));
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${x(11)}px "Inter", system-ui, sans-serif`;
  (ctx as any).letterSpacing = `${x(1.4)}px`;
  ctx.fillText(roleEn, W / 2, y + x(13));
  (ctx as any).letterSpacing = "0px";
  ctx.fillStyle = st.ink;
  ctx.font = `600 ${x(10.5)}px "Battambang", sans-serif`;
  ctx.fillText(st.km, W / 2, y + x(27));

  // details (left) + QR (right)
  const top = H - x(34) - x(100);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.setLineDash([x(4), x(3)]);
  ctx.lineWidth = x(1);
  ctx.beginPath();
  ctx.moveTo(x(18), top);
  ctx.lineTo(W - x(18), top);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "left";
  const label = (t: string, v: string, yy: number) => {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = `700 ${x(7.5)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(t, x(22), yy);
    ctx.fillStyle = "#0E3F24";
    ctx.font = `800 ${x(12)}px ui-monospace, "Consolas", monospace`;
    ctx.fillText(v, x(22), yy + x(15));
  };
  label("ID NO.", d.memberNo, top + x(18));
  label("MEMBER SINCE", d.since, top + x(52));
  if (d.verifyUrl) {
    const qs = x(78);
    const qx = W - x(22) - qs;
    const qy = top + x(10);
    const q = document.createElement("canvas");
    await QRCode.toCanvas(q, d.verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: Math.round(qs), color: { dark: "#0E3F24", light: "#FFFFFF" } });
    ctx.drawImage(q, qx, qy, qs, qs);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = `700 ${x(6.5)}px "Inter", system-ui, sans-serif`;
    ctx.fillText("SCAN TO VERIFY", qx + qs / 2, qy + qs + x(6));
  }

  // footer strip
  const fg = ctx.createLinearGradient(0, 0, W, 0);
  fg.addColorStop(0, st.from);
  fg.addColorStop(1, st.to);
  ctx.fillStyle = fg;
  ctx.fillRect(0, H - x(30), W, x(30));
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = `700 ${x(9.5)}px "Inter", system-ui, sans-serif`;
  ctx.fillText(d.site.replace(/^https?:\/\//, ""), W / 2, H - x(15));
  ctx.restore();
  return c.toDataURL("image/png");
}

/** The ID card as a sharp picture, with Save and Print buttons. */
export function IdCard({ data, fileName, labels, width = 280 }: { data: IdCardData; fileName: string; labels: { save: string; print: string }; width?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const key = JSON.stringify(data);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    drawCard(data).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!url || busy.current) return;
    busy.current = true;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      const phone = window.matchMedia("(pointer: coarse)").matches;
      if (phone && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Green Wild Zoo" }).catch(() => {});
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
      }
    } finally {
      busy.current = false;
    }
  }

  function print() {
    if (!url) return;
    // Print only the card, at its real size.
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const doc = f.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><style>@page{size:54mm 85.6mm;margin:0}html,body{margin:0}img{width:54mm;height:85.6mm;display:block}</style></head><body><img src="${url}"></body></html>`);
    doc.close();
    const img = doc.querySelector("img")!;
    const go = () => {
      f.contentWindow!.focus();
      f.contentWindow!.print();
      setTimeout(() => f.remove(), 1500);
    };
    if (img.complete) go();
    else img.onload = go;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="overflow-hidden rounded-[18px] shadow-lift ring-1 ring-black/10" style={{ width, height: (width * H) / W }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cream">
            <Loader2 className="animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={save} disabled={!url} className="btn-primary hover:translate-y-0 disabled:opacity-50">
          <Download size={16} /> {labels.save}
        </button>
        <button onClick={print} disabled={!url} className="btn-outline bg-white disabled:opacity-50">
          <Printer size={16} /> {labels.print}
        </button>
      </div>
    </div>
  );
}
