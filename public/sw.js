/* Green Wild Zoo service worker: keeps pages and files on the device so the
   site still opens when the internet is down or very slow.
   - app files (/_next/static, fonts, pictures): from the device first
   - pages: from the internet first; if it fails, or takes too long and a
     saved copy exists, the saved copy is shown
   - /api, payment and checkout pages: never saved
   Pages from the signed-in areas (/staff, /admin, /account…) are kept apart
   and removed on sign-out or when someone else signs in on the device. */

const VERSION = "v1";
const STATIC = `gwz-static-${VERSION}`;
const PAGES = `gwz-pages-${VERSION}`;
const PRIVATE = `gwz-private-${VERSION}`;
const META = "gwz-meta";
const KEEP = [STATIC, PAGES, PRIVATE, META];
const SLOW_MS = 5000; // a page that takes longer than this is shown from the device (when saved)

const PRIVATE_PATHS = [/^\/staff(\/|$)/, /^\/admin(\/|$)/, /^\/account(\/|$)/, /^\/my-tickets(\/|$)/];
const NEVER = [/^\/api\//, /^\/auth\//, /^\/pay\//, /^\/checkout/, /^\/staff\/login/, /^\/admin\/login/, /^\/account\/login/, /^\/_next\/data\//];
const recentFromCache = new Set();

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
      await trim(STATIC, 600);
      await self.clients.claim();
    })()
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

const isPrivate = (path) => PRIVATE_PATHS.some((r) => r.test(path));

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "clear") {
    event.waitUntil(Promise.all([caches.delete(PRIVATE), caches.delete(PAGES)]));
  } else if (d.type === "owner") {
    // someone else signed in on this device: forget the previous person's pages
    event.waitUntil(
      (async () => {
        const meta = await caches.open(META);
        const old = await meta.match("/__owner");
        const was = old ? await old.text() : "";
        if (was && was !== d.id) await caches.delete(PRIVATE);
        await meta.put("/__owner", new Response(d.id || ""));
      })()
    );
  } else if (d.type === "was-cached") {
    const hit = recentFromCache.has(d.url);
    recentFromCache.delete(d.url);
    event.source && event.source.postMessage({ type: "was-cached", url: d.url, cached: hit });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((r) => r.test(url.pathname))) return;

  // Next.js page data for moving between pages in the app
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    // on a dead connection, fail fast: Next then loads the whole page, which comes from the device
    event.respondWith(fetchWithin(req, 8000).catch(() => Response.error()));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(page(event, req, url));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:js|css|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|ico|mp3|wav|webm)$/i.test(url.pathname) || url.pathname.startsWith("/_next/image")) {
    event.respondWith(fromDeviceFirst(event, req));
  }
});

function fetchWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(req).then(
      (r) => {
        clearTimeout(t);
        resolve(r);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function fromDeviceFirst(event, req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    // pictures may change: refresh in the background (hashed app files never change)
    if (!req.url.includes("/_next/static/")) event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}

async function page(event, req, url) {
  const cache = await caches.open(isPrivate(url.pathname) ? PRIVATE : PAGES);
  // a ticket page is only ever shown for its own key (?k=…)
  const exact = url.pathname.startsWith("/ticket/");
  const saved = () => cache.match(req).then((r) => r || (exact ? undefined : cache.match(req, { ignoreSearch: true })));

  const network = fetch(req).then((res) => {
    if (res.ok && !res.redirected && res.type === "basic" && (res.headers.get("content-type") || "").includes("text/html")) {
      event.waitUntil(cache.put(req, res.clone()));
    }
    return res;
  });

  const fromDevice = async () => {
    const r = await saved();
    if (r) recentFromCache.add(url.href);
    return r;
  };

  try {
    // wait for the internet, but not forever when a saved copy exists
    const slow = new Promise((resolve) => setTimeout(() => resolve("slow"), SLOW_MS));
    const first = await Promise.race([network, slow]);
    if (first !== "slow") {
      // the server answered with an error (e.g. its database can't be reached): a saved copy is better
      if (first.status >= 500) return (await fromDevice()) || first;
      return first;
    }
    const r = await fromDevice();
    if (r) {
      event.waitUntil(network.catch(() => {})); // the fresh copy still gets saved for next time
      return r;
    }
    return await network;
  } catch {
    return (await fromDevice()) || offlinePage(url);
  }
}

function offlinePage(url) {
  const staff = url.pathname.startsWith("/staff");
  const html = `<!doctype html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Green Wild Zoo · Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${staff ? "#EEF2FF" : "#F4F8F1"};font-family:system-ui,sans-serif;color:#17231A}
.c{max-width:380px;margin:16px;padding:28px;border-radius:28px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center}
h1{font-size:20px;margin:10px 0 6px}p{margin:0 0 16px;color:#555;font-size:14px;line-height:1.7}
a,button{display:block;margin:8px 0;border:0;border-radius:999px;background:${staff ? "#1D4ED8" : "#176B3A"};color:#fff;font-weight:700;padding:12px 18px;font-size:15px;text-decoration:none;cursor:pointer}
a.alt{background:#fff;color:${staff ? "#1D4ED8" : "#176B3A"};box-shadow:inset 0 0 0 2px currentColor}</style></head>
<body><div class="c"><div style="font-size:40px">📶</div><h1>គ្មាន internet · You're offline</h1>
<p>ទំព័រនេះមិនទាន់បានរក្សាទុកក្នុងឧបករណ៍នៅឡើយ។ ទំព័រដែលអ្នកធ្លាប់បើក នៅតែបើកបាន។<br>This page isn't saved on this device yet. Pages you opened before still work.</p>
${staff ? '<a href="/staff/scanner">ស្កេនសំបុត្រ · Scanner</a><a href="/staff/gate" class="alt">រាប់ភ្ញៀវ · Gate counter</a><a href="/staff" class="alt">ទំព័រដើម · Staff home</a>' : '<a href="/">ទំព័រដើម · Home</a><a href="/my-tickets" class="alt">សំបុត្ររបស់ខ្ញុំ · My tickets</a>'}
<button onclick="location.reload()" class="alt" style="width:100%">សាកម្តងទៀត · Try again</button></div>
<script>addEventListener("online",function(){location.reload()})</script></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
