"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * A separate live connection for one call. The shared
 * browser client keeps one channel per name, so leaving a call and opening it
 * again at the same moment would clash.
 */
export function freshRealtime() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 40 } },
  });
}
