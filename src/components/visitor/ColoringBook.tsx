"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Eraser, Sparkles, Download, RotateCcw, PartyPopper } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

type Region = { id: string; d: string };
type Picture = {
  key: string;
  en: string;
  km: string;
  regions: Region[]; // tap to colour, painted in this order (back to front)
  details: string; // black lines/dots drawn on top (eyes, whiskers…), not colourable
  magic: Record<string, string>; // a nice ready-made colouring
};

// Simple, chunky drawings (400 x 400) with big areas that are easy for small fingers.
const PICTURES: Picture[] = [
  {
    key: "lion",
    en: "Lion",
    km: "តោ",
    regions: [
      { id: "sky", d: "M0 0H400V300H0Z" },
      { id: "sun", d: "M340 60m-34 0a34 34 0 1 0 68 0a34 34 0 1 0-68 0" },
      { id: "grass", d: "M0 300C80 280 140 310 200 296S320 280 400 300V400H0Z" },
      { id: "mane", d: "M200 70L228 92L262 84L272 116L304 132L292 164L310 194L284 214L286 248L252 254L236 284L204 272L172 288L156 256L122 250L126 216L98 196L118 166L106 134L138 118L150 86L182 94Z" },
      { id: "earL", d: "M140 126m-22 0a22 22 0 1 0 44 0a22 22 0 1 0-44 0" },
      { id: "earR", d: "M260 126m-22 0a22 22 0 1 0 44 0a22 22 0 1 0-44 0" },
      { id: "face", d: "M200 178m-78 0a78 74 0 1 0 156 0a78 74 0 1 0-156 0" },
      { id: "muzzle", d: "M200 214m-40 0a40 28 0 1 0 80 0a40 28 0 1 0-80 0" },
      { id: "nose", d: "M184 196Q200 186 216 196Q210 212 200 214Q190 212 184 196Z" },
    ],
    details:
      "M168 160m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M232 160m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M200 214v10 M186 228q14 12 28 0",
    magic: { sky: "#BDE7FF", sun: "#FFD23F", grass: "#7BC96F", mane: "#D9822B", earL: "#F4B860", earR: "#F4B860", face: "#F6C56B", muzzle: "#FFF1D6", nose: "#6B3E26" },
  },
  {
    key: "elephant",
    en: "Elephant",
    km: "ដំរី",
    regions: [
      { id: "sky", d: "M0 0H400V290H0Z" },
      { id: "cloud", d: "M60 80a26 26 0 0 1 48-12a22 22 0 0 1 38 14a18 18 0 0 1-4 36H70a20 20 0 0 1-10-38Z" },
      { id: "ground", d: "M0 290H400V400H0Z" },
      { id: "body", d: "M150 170C150 120 330 110 344 190C352 240 330 280 316 300H176C156 280 146 230 150 170Z" },
      { id: "legBack", d: "M286 270h34v70h-34z" },
      { id: "legFront", d: "M180 270h34v70h-34z" },
      { id: "head", d: "M150 180m-66 0a66 62 0 1 0 132 0a66 62 0 1 0-132 0" },
      { id: "ear", d: "M150 130C200 110 236 150 226 196C218 232 176 236 158 214Z" },
      { id: "trunk", d: "M96 196C80 230 76 270 96 300C104 312 122 306 118 292C104 262 112 236 124 214Z" },
      { id: "tusk", d: "M120 222Q100 244 88 246Q106 256 130 232Z" },
    ],
    details: "M126 166m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M186 300v40 M300 300v40",
    magic: { sky: "#CFEFFF", cloud: "#FFFFFF", ground: "#C9A66B", body: "#9FA8B4", legBack: "#8B94A1", legFront: "#8B94A1", head: "#AEB6C1", ear: "#F2B6C6", trunk: "#AEB6C1", tusk: "#FFF8E7" },
  },
  {
    key: "turtle",
    en: "Turtle",
    km: "អណ្តើក",
    regions: [
      { id: "water", d: "M0 0H400V400H0Z" },
      { id: "sand", d: "M0 320C90 300 170 330 260 316S360 300 400 312V400H0Z" },
      { id: "legs", d: "M110 250l-40 30 30 14 36-26Z M290 250l40 30-30 14-36-26Z M130 170l-44-20 12-26 44 22Z M270 170l44-20-12-26-44 22Z" },
      { id: "head", d: "M200 104m-34 0a34 32 0 1 0 68 0a34 32 0 1 0-68 0" },
      { id: "shell", d: "M200 136C290 136 318 200 300 254C286 290 114 290 100 254C82 200 110 136 200 136Z" },
      { id: "spot1", d: "M200 180l26 16v30l-26 16-26-16v-30Z" },
      { id: "spot2", d: "M144 196l20 12v24l-20 12-18-12v-22Z" },
      { id: "spot3", d: "M256 196l18 12v22l-18 12-20-12v-24Z" },
    ],
    details: "M186 98m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M214 98m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M190 116q10 8 20 0",
    magic: { water: "#8FD8F0", sand: "#F1D59B", legs: "#7FBF6A", head: "#8ACB74", shell: "#3E9A55", spot1: "#A3E635", spot2: "#A3E635", spot3: "#A3E635" },
  },
  {
    key: "fish",
    en: "Fish",
    km: "ត្រី",
    regions: [
      { id: "sea", d: "M0 0H400V400H0Z" },
      { id: "weed", d: "M40 400C20 340 70 320 44 260C80 300 80 350 70 400Z M350 400C340 350 380 330 360 280C392 320 392 360 380 400Z" },
      { id: "tail", d: "M290 200L360 140V260Z" },
      { id: "body", d: "M60 200C110 120 250 120 300 200C250 280 110 280 60 200Z" },
      { id: "stripe1", d: "M150 138C170 170 170 230 150 262C140 262 130 258 124 254C140 222 140 178 124 146C130 142 140 139 150 138Z" },
      { id: "stripe2", d: "M216 142C232 172 232 228 216 258C206 262 198 263 190 263C208 230 208 170 190 137C198 137 208 139 216 142Z" },
      { id: "fin", d: "M160 140Q190 90 236 132Z" },
      { id: "bubbles", d: "M70 100m-12 0a12 12 0 1 0 24 0a12 12 0 1 0-24 0 M96 66m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M60 44m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0" },
    ],
    details: "M102 190m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M70 214q10 6 18 0",
    magic: { sea: "#5EC4E8", weed: "#3E9A55", tail: "#FF8A3D", body: "#FFB547", stripe1: "#FFFFFF", stripe2: "#FFFFFF", fin: "#FF8A3D", bubbles: "#E6F7FF" },
  },
  {
    key: "owl",
    en: "Owl",
    km: "មៀម",
    regions: [
      { id: "night", d: "M0 0H400V400H0Z" },
      { id: "moon", d: "M330 70m-36 0a36 36 0 1 0 72 0a36 36 0 1 0-72 0" },
      { id: "branch", d: "M0 320H400V350H0Z" },
      { id: "body", d: "M200 90C280 90 300 170 296 230C292 300 250 330 200 330S108 300 104 230C100 170 120 90 200 90Z" },
      { id: "wingL", d: "M112 190C86 230 92 290 130 310C124 270 128 230 112 190Z" },
      { id: "wingR", d: "M288 190C314 230 308 290 270 310C276 270 272 230 288 190Z" },
      { id: "belly", d: "M200 200C250 200 262 250 250 290C236 318 164 318 150 290C138 250 150 200 200 200Z" },
      { id: "eyeL", d: "M166 158m-30 0a30 30 0 1 0 60 0a30 30 0 1 0-60 0" },
      { id: "eyeR", d: "M234 158m-30 0a30 30 0 1 0 60 0a30 30 0 1 0-60 0" },
      { id: "beak", d: "M188 186L212 186L200 208Z" },
    ],
    details: "M166 158m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0 M234 158m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0 M150 100l-18-30 34 14 M250 100l18-30-34 14",
    magic: { night: "#24305E", moon: "#FFE08A", branch: "#7A4A26", body: "#A0714F", wingL: "#7E5537", wingR: "#7E5537", belly: "#EBD2B4", eyeL: "#FFFFFF", eyeR: "#FFFFFF", beak: "#F4A62A" },
  },
  {
    key: "penguin",
    en: "Penguin",
    km: "ភេនឃ្វីន",
    regions: [
      { id: "sky", d: "M0 0H400V280H0Z" },
      { id: "ice", d: "M0 280L80 250L170 276L260 246L400 272V400H0Z" },
      { id: "body", d: "M200 70C268 70 290 150 292 230C294 300 256 340 200 340S106 300 108 230C110 150 132 70 200 70Z" },
      { id: "belly", d: "M200 130C244 130 256 190 256 240C256 296 232 320 200 320S144 296 144 240C144 190 156 130 200 130Z" },
      { id: "flipL", d: "M112 170C84 210 80 260 96 286C112 270 118 220 118 190Z" },
      { id: "flipR", d: "M288 170C316 210 320 260 304 286C288 270 282 220 282 190Z" },
      { id: "beak", d: "M184 128L216 128L200 150Z" },
      { id: "feet", d: "M160 334h36l-8 16h-36Z M204 334h36l8 16h-36Z" },
    ],
    details: "M180 108m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M220 108m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0",
    magic: { sky: "#CFEFFF", ice: "#F0FAFF", body: "#2B3445", belly: "#FFFFFF", flipL: "#1F2633", flipR: "#1F2633", beak: "#F4A62A", feet: "#F4A62A" },
  },
  {
    key: "panda",
    en: "Panda",
    km: "ផេនដា",
    regions: [
      { id: "bg", d: "M0 0H400V400H0Z" },
      { id: "bamboo", d: "M40 400V120h24v280Z M330 400V90h24v310Z" },
      { id: "leaves", d: "M64 150q40-30 70-10q-40 20-70 10Z M330 120q-40-30-70-10q40 20 70 10Z" },
      { id: "earL", d: "M130 110m-34 0a34 34 0 1 0 68 0a34 34 0 1 0-68 0" },
      { id: "earR", d: "M270 110m-34 0a34 34 0 1 0 68 0a34 34 0 1 0-68 0" },
      { id: "body", d: "M200 250m-110 0a110 100 0 1 0 220 0a110 100 0 1 0-220 0" },
      { id: "head", d: "M200 170m-92 0a92 82 0 1 0 184 0a92 82 0 1 0-184 0" },
      { id: "patchL", d: "M152 170C136 150 150 132 170 142C184 150 180 180 166 184C160 186 156 178 152 170Z" },
      { id: "patchR", d: "M248 170C264 150 250 132 230 142C216 150 220 180 234 184C240 186 244 178 248 170Z" },
      { id: "arms", d: "M110 250C92 290 110 330 140 330C150 300 140 270 130 250Z M290 250C308 290 290 330 260 330C250 300 260 270 270 250Z" },
    ],
    details: "M166 162m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M234 162m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M190 196q10 8 20 0 M192 186h16l-8 8Z",
    magic: { bg: "#DFF4D8", bamboo: "#7FBF6A", leaves: "#3E9A55", earL: "#1F2633", earR: "#1F2633", body: "#FFFFFF", head: "#FFFFFF", patchL: "#1F2633", patchR: "#1F2633", arms: "#1F2633" },
  },
  {
    key: "giraffe",
    en: "Giraffe",
    km: "ហ្សីរ៉ាហ្វ",
    regions: [
      { id: "sky", d: "M0 0H400V300H0Z" },
      { id: "tree", d: "M300 300V200h20v100Z M310 200m-60 0a60 44 0 1 0 120 0a60 44 0 1 0-120 0" },
      { id: "grass", d: "M0 300H400V400H0Z" },
      { id: "body", d: "M110 250C110 210 230 200 250 240C262 266 252 300 232 304H130C116 300 108 280 110 250Z" },
      { id: "legs", d: "M126 296h18v76h-18Z M160 300h18v72h-18Z M200 300h18v72h-18Z M228 296h18v76h-18Z" },
      { id: "neck", d: "M206 230C200 170 196 120 190 80L222 76C226 120 236 170 246 232Z" },
      { id: "head", d: "M176 70C176 44 234 40 238 66C242 84 226 96 206 96C188 96 176 88 176 70Z" },
      { id: "spots", d: "M150 240m-12 0a12 10 0 1 0 24 0a12 10 0 1 0-24 0 M196 256m-14 0a14 11 0 1 0 28 0a14 11 0 1 0-28 0 M214 150m-8 0a8 10 0 1 0 16 0a8 10 0 1 0-16 0 M206 196m-8 0a8 10 0 1 0 16 0a8 10 0 1 0-16 0" },
    ],
    details: "M194 46v-18 M214 44v-18 M194 28m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M214 26m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M200 66m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0",
    magic: { sky: "#BDE7FF", tree: "#5FA046", grass: "#A3D977", body: "#F6C56B", legs: "#F6C56B", neck: "#F6C56B", head: "#F6C56B", spots: "#B7702C" },
  },
  {
    key: "butterfly",
    en: "Butterfly",
    km: "មេអំបៅ",
    regions: [
      { id: "bg", d: "M0 0H400V400H0Z" },
      { id: "flowerL", d: "M70 340m-26 0a26 26 0 1 0 52 0a26 26 0 1 0-52 0" },
      { id: "flowerR", d: "M330 350m-22 0a22 22 0 1 0 44 0a22 22 0 1 0-44 0" },
      { id: "wingTL", d: "M196 190C150 80 60 70 64 140C68 200 140 214 196 200Z" },
      { id: "wingTR", d: "M204 190C250 80 340 70 336 140C332 200 260 214 204 200Z" },
      { id: "wingBL", d: "M196 210C140 220 96 260 120 296C148 330 190 280 196 226Z" },
      { id: "wingBR", d: "M204 210C260 220 304 260 280 296C252 330 210 280 204 226Z" },
      { id: "dots", d: "M120 140m-16 0a16 16 0 1 0 32 0a16 16 0 1 0-32 0 M280 140m-16 0a16 16 0 1 0 32 0a16 16 0 1 0-32 0 M146 268m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M254 268m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0" },
      { id: "body", d: "M200 150m-12 0a12 70 0 1 0 24 0a12 70 0 1 0-24 0" },
    ],
    details: "M196 90q-20-40-40-44 M204 90q20-40 40-44",
    magic: { bg: "#FFF4D6", flowerL: "#F472B6", flowerR: "#FFD23F", wingTL: "#FF8A3D", wingTR: "#FF8A3D", wingBL: "#8B5CF6", wingBR: "#8B5CF6", dots: "#FFFFFF", body: "#3B2A1E" },
  },
  {
    key: "crocodile",
    en: "Crocodile",
    km: "ក្រពើ",
    regions: [
      { id: "sky", d: "M0 0H400V210H0Z" },
      { id: "river", d: "M0 210H400V400H0Z" },
      { id: "tail", d: "M300 250C340 250 380 240 396 220C392 260 350 280 300 282Z" },
      { id: "body", d: "M90 230C120 200 280 200 310 240C300 276 140 290 100 270Z" },
      { id: "jawTop", d: "M100 234C70 222 30 222 14 234C30 244 70 250 100 250Z" },
      { id: "jawBottom", d: "M100 256C70 262 34 264 18 256C34 272 74 276 102 268Z" },
      { id: "bumps", d: "M150 212l10-14 10 14Z M190 208l10-14 10 14Z M230 210l10-14 10 14Z M270 218l10-14 10 14Z" },
      { id: "legs", d: "M130 270l-10 30h24l6-28Z M250 270l10 30h-24l-6-28Z" },
    ],
    details: "M112 222m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M30 250h60",
    magic: { sky: "#CFEFFF", river: "#5EC4E8", tail: "#4E8F3A", body: "#5FA046", jawTop: "#5FA046", jawBottom: "#A3D977", bumps: "#3E7A2E", legs: "#4E8F3A" },
  },
  {
    key: "parrot",
    en: "Parrot",
    km: "សេក",
    regions: [
      { id: "bg", d: "M0 0H400V400H0Z" },
      { id: "branch", d: "M20 300C120 290 280 296 390 280V304C280 320 120 316 20 326Z" },
      { id: "tail", d: "M190 290L170 390H214L214 290Z" },
      { id: "body", d: "M200 130C256 130 270 200 262 250C254 296 232 306 200 306S146 296 138 250C130 200 144 130 200 130Z" },
      { id: "wing", d: "M234 180C266 200 270 260 244 296C226 270 222 220 234 180Z" },
      { id: "head", d: "M200 110m-50 0a50 48 0 1 0 100 0a50 48 0 1 0-100 0" },
      { id: "face", d: "M186 104m-22 0a22 20 0 1 0 44 0a22 20 0 1 0-44 0" },
      { id: "beak", d: "M140 104C120 104 112 124 124 138C134 132 146 126 152 118Z" },
    ],
    details: "M184 102m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0",
    magic: { bg: "#DFF4D8", branch: "#7A4A26", tail: "#1D6FA3", body: "#E63946", wing: "#FFD23F", head: "#E63946", face: "#FFFFFF", beak: "#2B2B2B" },
  },
];

const PALETTE = ["#E63946", "#FF8A3D", "#FFD23F", "#A3E635", "#2E8B57", "#5EC4E8", "#1D6FA3", "#8B5CF6", "#F472B6", "#8B5A2B", "#F6C56B", "#9FA8B4", "#FFFFFF", "#1F2A24"];

const TEXT = {
  en: {
    pick: "Pick an animal",
    colors: "Pick a colour, then tap the picture",
    undo: "Undo",
    eraser: "Eraser",
    magic: "Magic colours",
    reset: "Start again",
    save: "Save my picture",
    done: "Beautiful! You coloured the whole picture!",
    progress: (a: number, b: number) => `${a} of ${b} parts coloured`,
  },
  km: {
    pick: "ជ្រើសរើសសត្វ",
    colors: "ជ្រើសពណ៌ រួចចុចលើរូប",
    undo: "ត្រឡប់វិញ",
    eraser: "ជ័រលុប",
    magic: "ពណ៌វេទមន្ត",
    reset: "ចាប់ផ្តើមថ្មី",
    save: "រក្សាទុករូបរបស់ខ្ញុំ",
    done: "ស្អាតណាស់! អ្នកលាបពណ៌រូបទាំងមូលហើយ!",
    progress: (a: number, b: number) => `លាបពណ៌បាន ${a} លើ ${b} ផ្នែក`,
  },
};

const STROKE = "#1F2A24";
/** The eraser clears a part back to blank (white is a normal colour). */
const ERASE = "erase";

/** Tap-to-fill colouring pages of zoo animals, made for small children. */
export function ColoringBook() {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const [pic, setPic] = useState(PICTURES[0].key);
  const [color, setColor] = useState(PALETTE[2]);
  const [fills, setFills] = useState<Record<string, Record<string, string>>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const picture = PICTURES.find((p) => p.key === pic)!;
  const current = fills[pic] ?? {};
  const coloured = picture.regions.filter((r) => current[r.id]).length;
  const total = picture.regions.length;

  // Remember each child's pictures on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gwz_coloring");
      if (saved) setFills(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("gwz_coloring", JSON.stringify(fills));
    } catch {
      /* ignore */
    }
  }, [fills]);

  const apply = (next: Record<string, string>) => {
    setHistory((h) => [...h.slice(-30), current]);
    setFills((f) => ({ ...f, [pic]: next }));
    const done = picture.regions.every((r) => next[r.id]);
    if (done && coloured < total) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3200);
    }
  };

  function paint(id: string) {
    if (color === ERASE) {
      if (!current[id]) return;
      const next = { ...current };
      delete next[id];
      return apply(next);
    }
    if (current[id] === color) return;
    apply({ ...current, [id]: color });
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      setFills((f) => ({ ...f, [pic]: h[h.length - 1] }));
      return h.slice(0, -1);
    });
  }

  async function save() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    });
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 1320;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#FFFBF1";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, 1200, 1200);
    ctx.fillStyle = "#0E3F24";
    ctx.textAlign = "center";
    ctx.font = `800 52px "Baloo 2", "Battambang", system-ui, sans-serif`;
    ctx.fillText(`${locale === "km" ? picture.km : picture.en}  |  Green Wild Zoo`, 600, 1280);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `green-wild-zoo-${picture.key}.png`;
    a.click();
  }

  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.08, color: PALETTE[i % 9] })), []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {/* Animal picker */}
        <p className="mb-2 text-sm font-bold text-forest">{L.pick}</p>
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {PICTURES.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPic(p.key);
                setHistory([]);
              }}
              className={cn(
                "flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow-soft ring-2 transition",
                pic === p.key ? "ring-primary" : "ring-transparent hover:ring-primary/40"
              )}
            >
              <svg viewBox="0 0 400 400" className="h-14 w-14">
                {p.regions.map((r) => (
                  <path key={r.id} d={r.d} fill={(fills[p.key] ?? {})[r.id] ?? "#fff"} stroke={STROKE} strokeWidth={8} strokeLinejoin="round" />
                ))}
              </svg>
              <span className="text-xs font-bold text-forest">{locale === "km" ? p.km : p.en}</span>
            </button>
          ))}
        </div>

        {/* The picture */}
        <div className="relative mx-auto max-w-[34rem] overflow-hidden rounded-[2rem] bg-white p-2 shadow-lift ring-4 ring-white">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className="block h-auto w-full touch-manipulation select-none rounded-[1.6rem]">
            {picture.regions.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill={current[r.id] ?? "#FFFFFF"}
                stroke={STROKE}
                strokeWidth={4}
                strokeLinejoin="round"
                onClick={() => paint(r.id)}
                className="cursor-pointer transition-[fill] duration-200 hover:opacity-90"
              />
            ))}
            <path d={picture.details} fill={STROKE} stroke={STROKE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
          </svg>
          {celebrate && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confetti.map((c, i) => (
                <span key={i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${c.left}%`, background: c.color, animation: `colorFall 1.6s ${c.delay}s ease-in forwards` }} />
              ))}
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-center font-display text-lg font-extrabold text-white shadow-lift animate-[gwzDrop_.4s_ease]">
                <PartyPopper size={22} /> {L.done}
              </div>
            </div>
          )}
        </div>
        <div className="mx-auto mt-3 max-w-[34rem]">
          <div className="flex justify-between text-xs font-semibold text-ink/55">
            <span>{L.progress(coloured, total)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-light-green">
            <div className="h-full rounded-full bg-gradient-to-r from-accent via-leaf to-primary transition-all duration-500" style={{ width: `${(coloured / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Colours and tools */}
      <div className="min-w-0 space-y-4">
        <div className="card p-4">
          <p className="mb-3 text-sm font-bold text-forest">{L.colors}</p>
          <div className="grid grid-cols-7 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn("aspect-square w-full rounded-full ring-2 ring-offset-2 transition active:scale-90", color === c ? "scale-110 ring-forest" : "ring-black/10 hover:scale-105")}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cream p-2">
            <span className="h-8 w-8 flex-shrink-0 rounded-full ring-2 ring-white" style={{ background: color === ERASE ? "repeating-linear-gradient(45deg,#fff 0 4px,#e5e7eb 4px 8px)" : color }} />
            <button
              onClick={() => setColor(ERASE)}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold", color === ERASE ? "bg-forest text-white" : "bg-white text-forest")}
            >
              <Eraser size={14} /> {L.eraser}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={undo} disabled={!history.length} className="btn-outline justify-center bg-white disabled:opacity-40">
            <Undo2 size={16} /> {L.undo}
          </button>
          <button onClick={() => apply({ ...picture.magic })} className="btn-outline justify-center bg-white">
            <Sparkles size={16} /> {L.magic}
          </button>
          <button onClick={() => apply({})} className="btn-outline justify-center bg-white">
            <RotateCcw size={16} /> {L.reset}
          </button>
          <button onClick={save} className="btn-primary justify-center hover:translate-y-0">
            <Download size={16} /> {L.save}
          </button>
        </div>
      </div>
      <style>{`@keyframes colorFall{from{transform:translateY(-20px) rotate(0)}to{transform:translateY(560px) rotate(540deg);opacity:0}}`}</style>
    </div>
  );
}
