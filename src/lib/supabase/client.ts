// Browser client — safe to import in Client Components.
// Uses the anon key only; RLS policies enforce what it can read/write.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // calls and live video send small bursts of connection notes (default is 10 a second)
    { realtime: { params: { eventsPerSecond: 40 } } }
  );
}
