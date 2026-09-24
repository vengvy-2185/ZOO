import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resilientFetch } from "./resilient-fetch";

// Anonymous, cookie-free client for PUBLIC data only (active animals,
// categories, map, tickets…). Because it doesn't depend on the visitor's
// session, its results can be cached and shared between all visitors
// (see src/lib/data/zoo.ts). Never use it for anything user-specific.
export function createPublicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  });
}
