/* Green Wild Zoo service worker: keeps pages and files on the device so the
   site still opens when the internet is down or very slow.
   - app files (/_next/static, fonts, pictures): from the device first
   - pages: from the internet first; if it fails, or takes too long and a
     saved copy exists, the saved copy is shown
   - /api, payment and checkout pages: never saved
   Pages from the signed-in areas (/staff, /admin, /account…) are kept apart
   and removed on sign-out or when someone else signs in on the device. */

const VERSION = "v7"; // a new version removes the pages saved by the old one
const STATIC = `gwz-static-${VERSION}`;
const PAGES = `gwz-pages-${VERSION}`;
const PRIVATE = `gwz-private-${VERSION}`;
const META = "gwz-meta";
const KEEP = [STATIC, PAGES, PRIVATE, META];
const SLOW_MS = 25000; // online: wait this long for the server before showing a saved copy

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
  if (d.type === "skip-waiting") {
    self.skipWaiting();
  } else if (d.type === "clear") {
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
    event.respondWith(fetchWithin(req, self.navigator && self.navigator.onLine === false ? 3000 : 20000).catch(() => Response.error()));
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
  // the app was just opened from its home-screen icon: show the animated
  // opening screen at once (no waiting for the internet), then the real page
  if (url.searchParams.get("source") === "app") return splash(url);
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
    // with internet, always the fresh page (a saved copy could be from before an update,
    // and its forms would no longer work); a saved copy only when the internet is gone,
    // or the server doesn't answer at all within a long wait
    const offline = self.navigator && self.navigator.onLine === false;
    const wait = new Promise((resolve) => setTimeout(() => resolve("slow"), offline ? 1500 : SLOW_MS));
    const first = await Promise.race([network, wait]);
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

/* ── Phone notifications ─────────────────────────────── */
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { title: "Green Wild Zoo", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "Green Wild Zoo", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: d.tag || undefined,
      renotify: Boolean(d.tag),
      requireInteraction: Boolean(d.urgent),
      vibrate: d.urgent ? [300, 120, 300, 120, 300] : [120, 60, 120],
      data: { url: d.url || "/staff" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/staff", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // an open window of the site: bring it forward on that page
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});


/* ── Opening screen when the app starts (instead of a blank white page) ── */
function splash(url) {
  const target = new URL(url.href);
  target.searchParams.delete("source");
  const staff = url.pathname.startsWith("/staff");
  const admin = url.pathname.startsWith("/admin");
  const c = staff ? { a: "#1E3A8A", b: "#2563EB", c: "#7C3AED" } : { a: "#0E3F24", b: "#176B3A", c: "#2E8B57" };
  const name = staff ? "GWZ បុគ្គលិក" : admin ? "GWZ Admin" : "Green Wild Zoo";
  const html = `<!doctype html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="${c.a}"><title>${name}</title>
<style>
html,body{margin:0;height:100%;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;width:100vw;background:linear-gradient(160deg,${c.a},${c.b} 55%,${c.c});font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
.w{display:flex;flex-direction:column;align-items:center;gap:18px;animation:in .5s ease-out both}
.logo{position:relative;width:128px;height:128px}
.ring{position:absolute;inset:-14px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#9BD13B;animation:spin 1.1s linear infinite}
.pulse{position:absolute;inset:0;border-radius:50%;background:rgba(255,255,255,.18);animation:pulse 1.6s ease-out infinite}
svg{position:relative;width:128px;height:128px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.35));animation:bob 1.6s ease-in-out infinite}
.toe{animation:toe 1.6s ease-in-out infinite;transform-origin:center}
.t2{animation-delay:.12s}.t3{animation-delay:.24s}.t4{animation-delay:.36s}
h1{margin:0;font-size:26px;font-weight:800;letter-spacing:.02em}
p{margin:0;font-size:14px;opacity:.8}
.bar{width:160px;height:5px;border-radius:9px;background:rgba(255,255,255,.2);overflow:hidden}
.bar i{display:block;height:100%;width:40%;border-radius:9px;background:#9BD13B;animation:run 1.2s ease-in-out infinite}
.leaf{position:fixed;top:-30px;width:14px;height:22px;border-radius:0 100% 0 100%;background:#9BD13B;opacity:.6;animation:fall linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.6);opacity:0}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes toe{0%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}}
@keyframes run{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
@keyframes in{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
@keyframes fall{to{transform:translateY(110vh) rotate(360deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body>
<span class="leaf" style="left:12%;animation-duration:5s"></span><span class="leaf" style="left:38%;animation-duration:6.5s;animation-delay:1s"></span><span class="leaf" style="left:66%;animation-duration:5.5s;animation-delay:.5s"></span><span class="leaf" style="left:88%;animation-duration:7s;animation-delay:1.6s"></span>
<div class="w">
  <div class="logo"><span class="pulse"></span><span class="ring"></span>
    <img src="/logo-sm.png" alt="" style="position:relative;width:128px;height:128px;border-radius:50%;background:#fff;object-fit:contain;padding:6px;box-shadow:0 12px 30px -10px rgba(0,0,0,.5)">
  </div>
  <h1>${name}</h1>
  <p>កំពុងបើក… · Opening…</p>
  <div class="bar"><i></i></div>
</div>
<script>setTimeout(function(){location.replace(${JSON.stringify(target.pathname + target.search)})},60)</script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
