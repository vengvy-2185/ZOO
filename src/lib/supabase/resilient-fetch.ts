// fetch() for server-side Supabase clients that survives a flaky connection.
//
// On an unstable network a single request to Supabase can fail outright
// ("fetch failed") or hang. Without retries, one blip made pages render
// empty — and the cache then kept that empty result for a minute, which
// looked like all the data had disappeared. Here each request gets a
// timeout, and reads (GET/HEAD) are retried a few times on network errors
// and 5xx. Writes are never retried, so an insert can never be duplicated.
const ATTEMPTS = 3;
const TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const resilientFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  // Refreshing the login session is also safe to retry quickly: Supabase
  // accepts the same refresh token again for a few seconds. Every OTHER
  // token call (e.g. the Google sign-in code exchange, grant_type=pkce) is
  // one-time only: it must never be retried or cut off by a timeout, or a
  // slow reply turns a successful sign-in into "code already used".
  const isRead = method === "GET" || method === "HEAD" || (url.includes("/auth/v1/token") && url.includes("grant_type=refresh_token"));
  const attempts = isRead ? ATTEMPTS : 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    // Only reads get a timeout: uploads on a slow line may legitimately take longer.
    const timer = isRead ? setTimeout(() => controller.abort(), TIMEOUT_MS) : undefined;
    // Respect a caller's own abort signal too.
    init?.signal?.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (res.status >= 500 && attempt < attempts - 1) {
        lastError = new Error(`Supabase ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      if (init?.signal?.aborted) throw e;
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts - 1) await sleep(300 * 3 ** attempt); // 0.3 s, 0.9 s
  }
  throw lastError;
};
