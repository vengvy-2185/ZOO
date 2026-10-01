// The assistant's robot: cleans the green fringe left by background removal
// (semi-transparent edge pixels that lean green), then makes small web files.
// Run: node scripts/make-robot.cjs
const fs = require("fs");
const { PNG } = require("pngjs");
const sharp = require("sharp");

const src = PNG.sync.read(fs.readFileSync("design/robot-original.png"));
const { width: w, height: h, data: d } = src;
const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
const nearClear = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (A(x + dx, y + dy) < 16) return true;
  return false;
};
let fixed = 0;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
    if (a < 16) continue;
    const greenish = g > r + 40 && g > b + 40;
    if (!greenish) continue;
    if (a < 245) {
      // the glow around the robot: neutral colour and much fainter
      d[i + 1] = Math.round(Math.max(r, b) * 0.6 + g * 0.4);
      d[i + 3] = Math.round(a * 0.25);
      fixed++;
    } else if (nearClear(x, y, 1)) {
      // a hard green line right on the outline
      d[i + 1] = Math.round(Math.max(r, b) * 0.5 + g * 0.5);
      fixed++;
    }
  }
const clean = PNG.sync.write(src);
(async () => {
  const trim = await sharp(clean).trim({ threshold: 1 }).toBuffer();
  await sharp(trim).resize({ width: 520 }).webp({ quality: 86, alphaQuality: 90 }).toFile("public/assistant/robot.webp");
  await sharp(trim).resize({ width: 520 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile("public/assistant/robot.png");
  await sharp(trim).resize({ width: 160 }).webp({ quality: 88 }).toFile("public/assistant/robot-sm.webp");
  // just the face, square, for small round spots (the chat header)
  const meta = await sharp(trim).metadata();
  const side = Math.round(meta.width * 0.62);
  await sharp(trim).extract({ left: Math.round(meta.width * 0.25), top: Math.round(meta.height * 0.035), width: side, height: side }).resize(160, 160).webp({ quality: 88 }).toFile("public/assistant/robot-face.webp");
  for (const f of ["robot.webp", "robot.png", "robot-sm.webp", "robot-face.webp"]) console.log(f, Math.round(fs.statSync(`public/assistant/${f}`).size / 1024) + " KB");
  console.log("edge pixels cleaned:", fixed);
})();
