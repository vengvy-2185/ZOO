// Server client — for Server Components, Route Handlers, and Server Actions.
// Reads the user's session from cookies so RLS applies as that user.
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { resilientFetch } from "./resilient-fetch";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: resilientFetch },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // called from a Server Component with no writable cookies; safe to ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see above
          }
        },
      },
    }
  );
}

// Service-role client — SERVER ONLY. Never import this from a Client
// Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
// Used only for privileged operations: QR token validation, ticket
// check-in, and admin bulk operations behind an authenticated API route.
import { createClient as createRawClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("Service role client must never be created in the browser.");
  }
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: resilientFetch } }
  );
}
