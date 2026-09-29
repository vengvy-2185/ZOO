import "server-only";
import { getPrivateSetting, type TurnSettings } from "./private-settings";

// The addresses calls and live video use to find each other. STUN is free and
// enough on most Wi-Fi; a TURN server (Admin → Integrations → Calls) passes
// the video along when two phones can't reach each other (often on 4G).
// Metered / Cloudflare give short-lived passwords, fetched here and kept for
// a while so each call doesn't ask again.

const STUN: RTCIceServer = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] };
let cached: { at: number; list: RTCIceServer[] } | null = null;

export function forgetIce() {
  cached = null;
}

export async function iceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() - cached.at < 30 * 60e3) return cached.list;
  const list: RTCIceServer[] = [STUN];
  // a server set in the hosting settings still works
  if (process.env.TURN_URL) list.push({ urls: process.env.TURN_URL.split(",").map((u) => u.trim()).filter(Boolean), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  const t = await getPrivateSetting<TurnSettings>("turn").catch(() => ({}) as TurnSettings);
  try {
    if (t.provider === "metered" && t.metered_app && t.metered_key) {
      const r = await fetch(`https://${t.metered_app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(t.metered_key)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      const json = await r.json();
      if (Array.isArray(json)) list.push(...json.filter((x: any) => x?.urls));
    } else if (t.provider === "cloudflare" && t.cf_key_id && t.cf_token) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${t.cf_key_id}/credentials/generate-ice-servers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t.cf_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 86400 }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const json = await r.json();
      const servers = json?.iceServers;
      if (Array.isArray(servers)) list.push(...servers);
      else if (servers?.urls) list.push(servers);
    } else if (t.provider === "custom" && t.url) {
      list.push({ urls: t.url.split(",").map((u) => u.trim()).filter(Boolean), username: t.username, credential: t.credential });
    }
  } catch {
    /* TURN not reachable right now: direct connections still work */
  }
  cached = { at: Date.now(), list };
  return list;
}
