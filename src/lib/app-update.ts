"use client";

/** Throws away everything this device kept (pages, logo, icons), takes the newest app and reloads. */
export async function updateApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update().catch(() => {});
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
    reg?.waiting?.postMessage({ type: "skip-waiting" });
  } catch {
    /* nothing kept: a reload is enough */
  }
  const url = new URL(location.href);
  url.searchParams.set("v", Date.now().toString(36)); // skip anything the browser kept for this address
  location.replace(url.toString());
}

/** Is a newer version of the website live than the one on this screen? */
export async function newerVersion() {
  const mine = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
  const r = await fetch("/api/version", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
  return Boolean(r?.v && mine && r.v !== mine);
}
