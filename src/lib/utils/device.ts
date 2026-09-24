// A random per-browser id — not tied to any account — used only so the
// Friends-on-the-Map feature can tell "which pin is mine" without requiring
// sign-in. Stored in localStorage; regenerating it just starts a fresh
// identity next time (nothing is lost server-side beyond that one pin).
const KEY = "gwz_device_token";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}
