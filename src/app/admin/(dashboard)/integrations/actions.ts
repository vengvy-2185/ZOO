"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { getPrivateSetting, serviceClient, type PaymentSettings, type TtsSettings } from "@/lib/server/private-settings";
import { checkAccount } from "@/lib/server/bakong";

// Server actions run as POST requests to the admin page, so they re-check
// the admin role themselves before touching secrets with the service role.
async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function save(key: "payment" | "tts", value: object) {
  const { error } = await serviceClient().from("private_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function savePayment(formData: FormData) {
  await requireAdmin();
  const current = await getPrivateSetting<PaymentSettings>("payment");
  const account = str(formData, "bakong_account_id");
  // A Bakong ID is name@bank (no dot after the @) — an email address is a common mix-up.
  if (account && !/^[a-z0-9._-]+@[a-z0-9]+$/i.test(account)) redirect(`/admin/integrations?msg=${account.includes(".") && /@.*\./.test(account) ? "email-account" : "bad-account"}`);
  const bankAccount = str(formData, "bank_account").replace(/[\s-]/g, "");
  if (bankAccount && !/^\d{6,24}$/.test(bankAccount)) redirect("/admin/integrations?msg=bad-bank-account");
  const next: PaymentSettings = {
    enabled: formData.get("enabled") === "on",
    bakong_account_id: account || undefined,
    bank_account: bankAccount || undefined,
    bank_name: str(formData, "bank_name") || undefined,
    merchant_name: str(formData, "merchant_name") || undefined,
    merchant_city: str(formData, "merchant_city") || undefined,
    currency: str(formData, "currency") === "KHR" ? "KHR" : "USD",
    usd_to_khr: Number(str(formData, "usd_to_khr")) || 4100,
    api_url: str(formData, "api_url") || undefined,
    // Blank means "keep the saved token"; the special value "-" clears it.
    api_token: str(formData, "api_token") === "-" ? undefined : str(formData, "api_token") || current.api_token,
  };
  await save("payment", next);
  redirect("/admin/integrations?msg=saved");
}

export async function testPayment() {
  await requireAdmin();
  const s = await getPrivateSetting<PaymentSettings>("payment");
  const r = await checkAccount(s);
  redirect(`/admin/integrations?test=${r.ok ? "ok" : "fail"}&detail=${encodeURIComponent(r.message)}`);
}

export async function saveTts(formData: FormData) {
  await requireAdmin();
  const current = await getPrivateSetting<TtsSettings>("tts");
  const next: TtsSettings = {
    azure_key: str(formData, "azure_key") === "-" ? undefined : str(formData, "azure_key") || current.azure_key,
    azure_region: str(formData, "azure_region") || undefined,
    voice_km: str(formData, "voice_km") || "km-KH-SreymomNeural",
    voice_en: str(formData, "voice_en") || "en-US-JennyNeural",
    voice_zh: str(formData, "voice_zh") || "zh-CN-XiaoxiaoNeural",
  };
  await save("tts", next);
  redirect("/admin/integrations?msg=saved");
}
