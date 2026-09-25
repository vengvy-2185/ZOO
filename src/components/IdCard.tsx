"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, Loader2, RotateCw } from "lucide-react";
import { CARD_STYLE, type CardType } from "@/lib/members";
import { LOGO_SVG } from "@/components/visitor/logo-svg";

// Real card size: CR80, 54 x 85.6 mm, drawn at about 300 dpi.
const W = 640;
const H = 1015;
const S = W / 280; // the layout below is designed on a 280 px wide card

export type IdCardData = { type: CardType; name: string; photo: string | null; memberNo: string; since: string; site: string; verifyUrl: string | null; /** e.g. a staff position, shown instead of the card type */ roleEn?: string | null; roleKm?: string | null };

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
  const roleEn = (d.roleEn || st.en).toUpperCase();
  const roleKm = d.roleKm || st.km;
  ctx.font = `600 ${x(10.5)}px "Battambang", sans-serif`;
  const pw = Math.max(ctx.measureText(roleKm).width, (() => { ctx.font = `800 ${x(11)}px "Inter", system-ui, sans-serif`; return ctx.measureText(roleEn).width + roleEn.length * x(1.4); })()) + x(28);
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
  ctx.fillText(roleKm, W / 2, y + x(27));

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

/** Splits text into lines that fit (works for Khmer, which has no spaces). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const Seg = (Intl as any).Segmenter;
  const parts: string[] = Seg ? [...new Seg(undefined, { granularity: "word" }).segment(text)].map((x: any) => x.segment) : text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const w of parts) {
    const t = line + w;
    if (ctx.measureText(t).width > max && line.trim()) {
      lines.push(line.trim());
      line = w.trimStart();
    } else line = t;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

async function drawBack(d: IdCardData): Promise<string> {
  await document.fonts?.ready;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const st = CARD_STYLE[d.type];
  const x = (n: number) => n * S;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, x(18));
  ctx.clip();

  // coloured back with soft leaves
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, st.from);
  bg.addColorStop(1, st.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  const leaves: [number, number, number, number, number][] = [
    [40, 60, 34, 18, 0.8], [250, 90, 40, 20, -0.6], [30, 380, 36, 18, -0.9], [255, 400, 34, 17, 0.7], [140, 20, 26, 12, 0.2],
  ];
  for (const [lx, ly, rx, ry, a] of leaves) {
    ctx.beginPath();
    ctx.ellipse(x(lx), x(ly), x(rx), x(ry), a, 0, Math.PI * 2);
    ctx.fill();
  }

  // strap slot (same place as the front)
  ctx.fillStyle = "#EEF2F0";
  ctx.beginPath();
  ctx.roundRect(W / 2 - x(36), x(13), x(72), x(12), x(6));
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = x(1);
  ctx.stroke();

  // logo + name + card type
  const logo = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG));
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(W / 2, x(52), x(19), 0, Math.PI * 2);
  ctx.fill();
  if (logo) ctx.drawImage(logo, W / 2 - x(17), x(35), x(34), x(34));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${x(15)}px "Baloo 2", system-ui, sans-serif`;
  ctx.fillText("GREEN WILD ZOO", W / 2, x(84));
  ctx.fillStyle = st.ink;
  ctx.font = `700 ${x(8.5)}px "Inter", system-ui, sans-serif`;
  (ctx as any).letterSpacing = `${x(1.2)}px`;
  ctx.fillText((d.roleEn || st.en).toUpperCase(), W / 2, x(100));
  (ctx as any).letterSpacing = "0px";

  // white panel
  const P = { x: x(16), y: x(112), w: W - x(32), h: x(282) };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = x(10);
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(P.x, P.y, P.w, P.h, x(14));
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.font = `700 ${x(7)}px "Inter", system-ui, sans-serif`;
  ctx.fillText("CARD HOLDER", W / 2, P.y + x(14));
  ctx.fillStyle = "#0E3F24";
  ctx.font = `800 ${x(14)}px "Baloo 2", "Battambang", system-ui, sans-serif`;
  ctx.fillText(wrapText(ctx, d.name, P.w - x(20))[0] ?? "", W / 2, P.y + x(30));

  // big QR
  if (d.verifyUrl) {
    const qs = x(112);
    const qx = W / 2 - qs / 2;
    const qy = P.y + x(44);
    const q = document.createElement("canvas");
    await QRCode.toCanvas(q, d.verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: Math.round(qs), color: { dark: "#0E3F24", light: "#FFFFFF" } });
    ctx.drawImage(q, qx, qy, qs, qs);
    ctx.strokeStyle = st.to;
    ctx.lineWidth = x(2);
    ctx.beginPath();
    ctx.roundRect(qx - x(5), qy - x(5), qs + x(10), qs + x(10), x(8));
    ctx.stroke();
    ctx.fillStyle = st.from;
    ctx.font = `800 ${x(7.5)}px "Inter", system-ui, sans-serif`;
    ctx.fillText("SCAN TO VERIFY  |  ស្កេនដើម្បីពិនិត្យ", W / 2, qy + qs + x(13));
  }

  // rules, in both languages
  const rules = [
    ["This card is personal and cannot be transferred.", "កាតនេះសម្រាប់តែម្ចាស់កាតប៉ុណ្ណោះ។"],
    ["Show it at the ticket counter when you visit.", "បង្ហាញកាតនេះនៅបញ្ជរលក់សំបុត្រ ពេលមកទស្សនា។"],
  ];
  let ry = P.y + x(186);
  ctx.textAlign = "left";
  for (const [en, km] of rules) {
    ctx.fillStyle = st.to;
    ctx.beginPath();
    ctx.arc(P.x + x(12), ry, x(2.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = `600 ${x(7.5)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(en, P.x + x(19), ry);
    ctx.fillStyle = "#64748B";
    ctx.font = `500 ${x(7.5)}px "Battambang", system-ui, sans-serif`;
    ctx.fillText(km, P.x + x(19), ry + x(11));
    ry += x(27);
  }

  // signature line
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = x(1);
  ctx.beginPath();
  ctx.moveTo(P.x + x(20), P.y + P.h - x(22));
  ctx.lineTo(P.x + P.w - x(20), P.y + P.h - x(22));
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.font = `600 ${x(6.5)}px "Inter", "Battambang", system-ui, sans-serif`;
  ctx.fillText("SIGNATURE  |  ហត្ថលេខា", W / 2, P.y + P.h - x(13));

  // if found
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${x(7.5)}px "Inter", system-ui, sans-serif`;
  ctx.fillText("If found, please return it to Green Wild Zoo.", W / 2, x(403));
  ctx.fillStyle = st.ink;
  ctx.font = `500 ${x(7.5)}px "Battambang", system-ui, sans-serif`;
  ctx.fillText("បើរើសបាន សូមប្រគល់មកសួនសត្វ Green Wild Zoo វិញ។", W / 2, x(414));

  // footer strip
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, H - x(22), W, x(22));
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${x(8.5)}px "Inter", system-ui, sans-serif`;
  ctx.fillText(d.site.replace(/^https?:\/\//, ""), W / 2, H - x(11));
  ctx.restore();
  return c.toDataURL("image/png");
}

type Labels = { save: string; print: string; flip?: string; hint?: string };

/** The ID card (front and back) as sharp pictures: tap to flip, save both, print both. */
export function IdCard({ data, fileName, labels, width = 280, viewOnly = false }: { data: IdCardData; fileName: string; labels: Labels; width?: number; /** show only: no save / print (staff see their card; admins print it) */ viewOnly?: boolean }) {
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const key = JSON.stringify(data);
  const busy = useRef(false);
  const h = (width * H) / W;

  useEffect(() => {
    let alive = true;
    Promise.all([drawCard(data), drawBack(data)]).then(([f, b]) => {
      if (!alive) return;
      setFront(f);
      setBack(b);
    });
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = !!front && !!back;

  async function save() {
    if (!front || !back || busy.current) return;
    busy.current = true;
    try {
      const toFile = async (u: string, side: string) => new File([await (await fetch(u)).blob()], `${fileName}-${side}.png`, { type: "image/png" });
      const files = [await toFile(front, "front"), await toFile(back, "back")];
      const phone = window.matchMedia("(pointer: coarse)").matches;
      if (phone && navigator.canShare?.({ files })) await navigator.share({ files, title: "Green Wild Zoo" }).catch(() => {});
      else
        for (const f of files) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f);
          a.download = f.name;
          a.click();
          await new Promise((r) => setTimeout(r, 400));
        }
    } finally {
      busy.current = false;
    }
  }

  function print() {
    if (!front || !back) return;
    // Two pages at the real card size: front, then back.
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const doc = f.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><style>@page{size:54mm 85.6mm;margin:0}html,body{margin:0}img{width:54mm;height:85.6mm;display:block;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body><img src="${front}"><img src="${back}"></body></html>`);
    doc.close();
    const imgs = [...doc.querySelectorAll("img")];
    let left = imgs.length;
    const go = () => {
      f.contentWindow!.focus();
      f.contentWindow!.print();
      setTimeout(() => f.remove(), 1500);
    };
    imgs.forEach((im) => (im.complete ? --left === 0 && go() : (im.onload = () => --left === 0 && go())));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-label={labels.flip ?? "Flip"}
        onContextMenu={viewOnly ? (e) => e.preventDefault() : undefined}
        className={`relative cursor-pointer rounded-[18px] outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${viewOnly ? "select-none [-webkit-touch-callout:none]" : ""}`}
        style={{ width, height: h, perspective: "1400px" }}
      >
        <span className="absolute inset-0 block transition-transform duration-700 [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
          <span className="absolute inset-0 overflow-hidden rounded-[18px] shadow-lift ring-1 ring-black/10 [backface-visibility:hidden]">
            {front ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={front} alt="" draggable={!viewOnly} className="h-full w-full" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-cream">
                <Loader2 className="animate-spin text-primary" />
              </span>
            )}
          </span>
          <span className="absolute inset-0 overflow-hidden rounded-[18px] shadow-lift ring-1 ring-black/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {back && <img src={back} alt="" draggable={!viewOnly} className="h-full w-full" />}
          </span>
        </span>
      </button>
      {labels.hint && <p className="-mt-1 text-xs text-ink/45">{labels.hint}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={() => setFlipped((v) => !v)} disabled={!ready} className="btn-outline bg-white disabled:opacity-50">
          <RotateCw size={16} /> {labels.flip ?? "Flip"}
        </button>
        {!viewOnly && (
          <>
            <button onClick={save} disabled={!ready} className="btn-primary hover:translate-y-0 disabled:opacity-50">
              <Download size={16} /> {labels.save}
            </button>
            <button onClick={print} disabled={!ready} className="btn-outline bg-white disabled:opacity-50">
              <Printer size={16} /> {labels.print}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
