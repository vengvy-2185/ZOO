"use client";

import { useEffect, useState } from "react";
import { Sprout, PawPrint, Compass, Binoculars, Crown, Trophy, Share2, Loader2, Lock, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { LOGO_SVG } from "./logo-svg";

type Rank = { key: string; en: string; km: string; at: number; Icon: LucideIcon; from: string; to: string };

// "at" is the share of the zoo's animals you need to have found (the first two are counts).
export const RANKS: Rank[] = [
  { key: "seed", en: "New Explorer", km: "អ្នករុករកថ្មី", at: 0, Icon: Sprout, from: "#A7C4A0", to: "#6B8F63" },
  { key: "cub", en: "Cub Tracker", km: "អ្នកតាមដានកូនសត្វ", at: 1, Icon: PawPrint, from: "#F4C95D", to: "#D98F2B" },
  { key: "scout", en: "Jungle Scout", km: "កាយរិទ្ធព្រៃ", at: 0.25, Icon: Compass, from: "#8CCB63", to: "#2E8B57" },
  { key: "ranger", en: "Wild Ranger", km: "អ្នកយាមព្រៃ", at: 0.5, Icon: Binoculars, from: "#5EC4E8", to: "#1D6FA3" },
  { key: "master", en: "Safari Master", km: "មេសាហ្វារី", at: 0.75, Icon: Crown, from: "#F59E7B", to: "#C2410C" },
  { key: "hero", en: "Wildlife Hero", km: "វីរបុរសសត្វព្រៃ", at: 1.0001, Icon: Trophy, from: "#FDE68A", to: "#B45309" },
];

/** Animals needed for each rank, given how many animals the zoo has. */
function needed(r: Rank, total: number) {
  if (r.key === "seed") return 0;
  if (r.key === "cub") return 1;
  if (r.key === "hero") return total;
  return Math.max(2, Math.ceil(r.at * total));
}

export function rankFor(found: number, total: number) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (total > 0 && found >= needed(r, total)) idx = i;
  });
  return idx;
}

const TEXT = {
  en: {
    yourRank: "Your explorer rank",
    toNext: (n: number, rank: string) => `Find ${n} more ${n === 1 ? "animal" : "animals"} to become ${rank}`,
    top: "You reached the highest rank. The whole zoo is proud of you!",
    card: "My Explorer Card",
    namePh: "Your name on the card",
    explorer: "Explorer",
    found: (a: number, b: number) => `${a} of ${b} animals found`,
    medals: "Medals",
  },
  km: {
    yourRank: "ឋានៈអ្នករុករករបស់អ្នក",
    toNext: (n: number, rank: string) => `រកសត្វ ${n} ក្បាលទៀត ដើម្បីក្លាយជា${rank}`,
    top: "អ្នកឡើងដល់ឋានៈខ្ពស់បំផុតហើយ។ សួនសត្វទាំងមូលមានមោទនភាពចំពោះអ្នក!",
    card: "កាតអ្នករុករករបស់ខ្ញុំ",
    namePh: "ឈ្មោះរបស់អ្នកលើកាត",
    explorer: "អ្នករុករក",
    found: (a: number, b: number) => `រកឃើញ ${a} លើ ${b} ក្បាល`,
    medals: "មេដាយ",
  },
};

function Medal({ r, size = 56, locked }: { r: Rank; size?: number; locked?: boolean }) {
  return (
    <span
      className={cn("relative flex flex-shrink-0 items-center justify-center rounded-full text-white shadow-soft ring-4 ring-white", locked && "grayscale")}
      style={{ width: size, height: size, background: locked ? "#d8ddd9" : `linear-gradient(135deg, ${r.from}, ${r.to})` }}
    >
      {locked ? <Lock size={size * 0.34} className="text-white/90" /> : <r.Icon size={size * 0.46} strokeWidth={2.3} />}
    </span>
  );
}

/** Rank card + medals + "My Explorer Card" download for the Animal Quest page. */
export function QuestRank({ found, total, images }: { found: number; total: number; images: string[] }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const idx = rankFor(found, total);
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem("gwz_explorer_name") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const toNext = next ? needed(next, total) - found : 0;
  const prevAt = needed(rank, total);
  const nextAt = next ? needed(next, total) : total;
  const pct = next ? Math.min(100, ((found - prevAt) / Math.max(1, nextAt - prevAt)) * 100) : 100;

  async function makeCard() {
    setBusy(true);
    try {
      try {
        localStorage.setItem("gwz_explorer_name", name.trim());
      } catch {
        /* ignore */
      }
      await document.fonts?.ready;
      const W = 1080;
      const H = 1350;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#0E3F24");
      g.addColorStop(1, "#2E8B57");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // glow behind the medal
      const glow = ctx.createRadialGradient(W / 2, 470, 20, W / 2, 470, 420);
      glow.addColorStop(0, rank.from + "cc");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      // light rays
      ctx.save();
      ctx.translate(W / 2, 470);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let i = 0; i < 16; i++) {
        ctx.rotate((Math.PI * 2) / 16);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-40, -700);
        ctx.lineTo(40, -700);
        ctx.fill();
      }
      ctx.restore();

      const logo = await new Promise<HTMLImageElement | null>((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG);
      });
      if (logo) ctx.drawImage(logo, 70, 60, 90, 90);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `800 44px "Baloo 2", system-ui, sans-serif`;
      ctx.fillText("GREEN WILD ZOO", 180, 92);
      ctx.fillStyle = "#A3E635";
      ctx.font = `700 24px "Baloo 2", system-ui, sans-serif`;
      ctx.fillText("EXPLORER CARD", 182, 132);

      // medal
      const mg = ctx.createLinearGradient(W / 2 - 170, 300, W / 2 + 170, 640);
      mg.addColorStop(0, rank.from);
      mg.addColorStop(1, rank.to);
      ctx.beginPath();
      ctx.arc(W / 2, 470, 185, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W / 2, 470, 165, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();
      // icon: draw the lucide icon from the DOM (rendered hidden below)
      const svgEl = document.getElementById(`rank-icon-${rank.key}`)?.querySelector("svg");
      if (svgEl) {
        const clone = svgEl.cloneNode(true) as SVGElement;
        clone.setAttribute("width", "180");
        clone.setAttribute("height", "180");
        clone.setAttribute("stroke", "#ffffff");
        const icon = await new Promise<HTMLImageElement | null>((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
        });
        if (icon) ctx.drawImage(icon, W / 2 - 90, 380, 180, 180);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = `800 72px ${km ? '"Battambang",' : ""} "Baloo 2", system-ui, sans-serif`;
      ctx.fillText(km ? rank.km : rank.en, W / 2, 740);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `600 44px "Battambang", "Baloo 2", system-ui, sans-serif`;
      ctx.fillText(name.trim() || L.explorer, W / 2, 820);

      // found animals
      const pics = await Promise.all(
        images.slice(0, 10).map(
          (src) =>
            new Promise<HTMLImageElement | null>((res) => {
              const i = new Image();
              i.crossOrigin = "anonymous";
              i.onload = () => res(i);
              i.onerror = () => res(null);
              i.src = src;
            })
        )
      );
      const ok = pics.filter(Boolean) as HTMLImageElement[];
      const r = 58;
      const gap = 18;
      const perRow = Math.min(5, ok.length);
      ok.forEach((img, i) => {
        const row = Math.floor(i / 5);
        const inRow = Math.min(5, ok.length - row * 5);
        const x = W / 2 - ((inRow - 1) * (r * 2 + gap)) / 2 + (i % 5) * (r * 2 + gap);
        const y = 950 + row * (r * 2 + gap);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
        ctx.drawImage(img, x - (img.naturalWidth * s) / 2, y - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
        ctx.restore();
      });
      void perRow;

      ctx.fillStyle = "#A3E635";
      ctx.font = `700 40px "Battambang", "Baloo 2", system-ui, sans-serif`;
      ctx.fillText(L.found(found, total), W / 2, ok.length > 5 ? 1215 : 1090);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = `500 26px "Inter", system-ui, sans-serif`;
      const d = new Date();
      ctx.fillText(`${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}   ${window.location.host}`, W / 2, 1290);

      const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
      const file = new File([blob], "green-wild-zoo-explorer.png", { type: "image/png" });
      const download = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
      };
      // Phones open the share sheet (Telegram, Facebook, Photos); computers just save the picture.
      const phone = window.matchMedia("(pointer: coarse)").matches;
      if (phone && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Green Wild Zoo" }).catch((e) => {
          if (e?.name !== "AbortError") download();
        });
      } else download();
    } finally {
      setBusy(false);
    }
  }

  if (total === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-black/5">
      <div className="relative overflow-hidden p-5 text-white sm:p-6" style={{ background: `linear-gradient(135deg, ${rank.to}, #0E3F24)` }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-40 blur-2xl" style={{ background: rank.from }} />
        <div className="relative flex items-center gap-4">
          <Medal r={rank} size={76} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white/75">{L.yourRank}</p>
            <p className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{km ? rank.km : rank.en}</p>
            <p className="mt-0.5 text-sm text-white/85">{next ? L.toNext(toNext, km ? next.km : next.en) : L.top}</p>
          </div>
        </div>
        <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="mb-3 text-sm font-bold text-forest">{L.medals}</p>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0">
          {RANKS.map((r, i) => (
            <div key={r.key} className="flex w-20 flex-shrink-0 flex-col items-center gap-1.5 text-center sm:w-auto">
              <span id={`rank-icon-${r.key}`}>
                <Medal r={r} size={52} locked={i > idx} />
              </span>
              <span className={cn("text-[11px] font-bold leading-tight", i > idx ? "text-ink/35" : "text-forest")}>{km ? r.km : r.en}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={28} placeholder={L.namePh} className="input flex-1" />
          <button onClick={makeCard} disabled={busy} className="btn-primary justify-center whitespace-nowrap hover:translate-y-0">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} {L.card}
          </button>
        </div>
      </div>
    </section>
  );
}
