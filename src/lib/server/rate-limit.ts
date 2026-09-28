import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** The caller's address (first one the proxy saw). */
export function clientIp() {
  try {
    const h = headers();
    return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();
  } catch {
    return "unknown";
  }
}

/**
 * true when this caller may go on: at most `limit` calls per `seconds` for
 * `name` (per IP, or per user when given). If the counter can't be reached
 * the call is allowed, so a database hiccup never blocks real visitors.
 */
export async function allow(name: string, limit: number, seconds: number, who?: string | null) {
  try {
    const { data, error } = await createServiceRoleClient().rpc("hit_rate_limit", { p_key: `${name}:${who || clientIp()}`, p_limit: limit, p_window_seconds: seconds });
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

export const tooMany = () => NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429, headers: { "Retry-After": "60" } });
