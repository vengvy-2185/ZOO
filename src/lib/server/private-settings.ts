import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resilientFetch } from "@/lib/supabase/resilient-fetch";

// Secrets (Bakong API token, text-to-speech key…) live in the admin-only
// private_settings table and are read here with the service role. This
// module is server-only — importing it into a client component fails the build.

export interface PaymentSettings {
  enabled?: boolean;
  bakong_account_id?: string; // e.g. "greenwildzoo@aba"
  bank_account?: string; // optional: the bank account number the Bakong ID is linked to (put in the KHQR)
  bank_name?: string; // optional: that bank's name, e.g. "ABA Bank"
  qr_logo_mode?: "site" | "khqr" | "custom"; // what sits in the middle of the KHQR (default: the website logo)
  qr_logo_url?: string; // the uploaded logo for "custom"
  merchant_name?: string;
  merchant_city?: string;
  currency?: "USD" | "KHR";
  usd_to_khr?: number; // exchange rate used when charging in riel
  api_url?: string; // default https://api-bakong.nbc.gov.kh
  api_token?: string; // from https://api-bakong.nbc.gov.kh/register
}

export interface TtsSettings {
  azure_key?: string;
  azure_region?: string; // e.g. "southeastasia"
  voice_km?: string; // e.g. "km-KH-SreymomNeural"
  voice_en?: string; // e.g. "en-US-JennyNeural"
  voice_zh?: string; // e.g. "zh-CN-XiaoxiaoNeural"
}

export function serviceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  });
}

export async function getPrivateSetting<T>(key: "payment" | "tts"): Promise<T> {
  const { data } = await serviceClient().from("private_settings").select("value").eq("key", key).maybeSingle();
  return ((data?.value as T) ?? ({} as T)) as T;
}

/** Last 4 characters only — the admin UI never sends a full secret back to the browser. */
export function mask(secret?: string) {
  return secret ? `••••${secret.slice(-4)}` : "";
}
