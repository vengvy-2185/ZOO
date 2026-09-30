// Makes every logo / app-icon size from one picture: node scripts/make-logo-icons.cjs <logo.png>
// (website logo, phone home-screen icons, browser tab icon, share image).
const sharp = require("sharp");
const path = require("path");
const src = process.argv[2] || path.join(__dirname, "..", "design", "logo-original.png");
const pub = path.join(__dirname, "..", "public");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function onSquare(size, scale, background, out) {
  const inner = Math.round(size * scale);
  const logo = await sharp(src).trim().resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: logo, gravity: "center" }]).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(out);
}

(async () => {
  const trimmed = sharp(src).trim();
  // the logo itself (see-through background)
  await trimmed.clone().resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(path.join(pub, "logo.png"));
  await sharp(src).trim().resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(path.join(pub, "logo-sm.png"));
  // phone / computer app icons (white square, logo inside)
  await onSquare(192, 0.92, WHITE, path.join(pub, "icons", "icon-192.png"));
  await onSquare(512, 0.92, WHITE, path.join(pub, "icons", "icon-512.png"));
  await onSquare(180, 0.9, WHITE, path.join(pub, "icons", "apple-touch-icon.png"));
  // Android "maskable" icons are cut to a circle / squircle: keep the logo inside the safe middle
  await onSquare(512, 0.78, WHITE, path.join(pub, "icons", "maskable-512.png"));
  await onSquare(512, 0.78, WHITE, path.join(pub, "icons", "staff-maskable-512.png"));
  // browser tab icon
  await onSquare(96, 1, { r: 0, g: 0, b: 0, alpha: 0 }, path.join(__dirname, "..", "src", "app", "icon.png"));
  // share image for Facebook / Telegram / Google (1200 x 630)
  const logo = await sharp(src).trim().resize(470, 470, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E3F24"/><stop offset="1" stop-color="#2E8B57"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <circle cx="330" cy="315" r="262" fill="#fff"/>
    <text x="630" y="270" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900" fill="#fff">Green Wild Zoo</text>
    <text x="632" y="340" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#B8F07A">Nature · Animals · Together</text>
    <text x="632" y="410" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#E6F4EA">Tickets · Animals · Map · Events</text>
  </svg>`);
  await sharp(bg).composite([{ input: logo, left: 330 - 235, top: 315 - 235 }]).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(path.join(pub, "og.png"));
  console.log("done");
})();
