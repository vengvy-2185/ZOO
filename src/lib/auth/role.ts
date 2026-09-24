import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resilientFetch } from "@/lib/supabase/resilient-fetch";

/**
 * A user's role (admin / staff / visitor), cached for 60 s per user so each
 * admin click doesn't wait on another database round trip.
 *
 * Only call this with a VERIFIED user id (getVerifiedUserId, or the id from
 * getSessionUser, whose token signature is checked) — it reads with the
 * service role, so it must never be fed an id the browser could make up.
 */
export const getCachedRole = unstable_cache(
  async (userId: string): Promise<{ role: string | null; fullName: string | null }> => {
    const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: resilientFetch },
    });
    const { data, error } = await admin.from("profiles").select("role, full_name").eq("id", userId).maybeSingle();
    // Throwing (instead of returning "no role") keeps a network blip out of the cache,
    // so an admin is never locked out for a minute by one failed request.
    if (error) throw new Error(`Could not load role: ${error.message}`);
    return { role: data?.role ?? null, fullName: data?.full_name ?? null };
  },
  ["user-role"],
  { revalidate: 60, tags: ["user-roles"] }
);
