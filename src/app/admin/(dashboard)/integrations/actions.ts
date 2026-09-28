"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { getPrivateSetting, serviceClient, TELEGRAM_EVENTS, type PaymentSettings, type TelegramSettings, type TtsSettings } from "@/lib/server/private-settings";
import { recentChats, sendTelegram } from "@/lib/server/telegram";
import { checkAccount } from "@/lib/server/bakong";
import { resolveImage } from "@/lib/admin/upload";

// Server actions run as POST requests to the admin page, so they re-check
// the admin role themselves before touching secrets with the service role.
async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function save(key: "payment" | "tts" | "telegram", value: object) {
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
    qr_logo_mode: (["site", "khqr", "custom"] as const).find((m) => m === str(formData, "qr_logo_mode")) ?? "site",
    qr_logo_url: (await resolveImage(formData, "qr_logo", "khqr")) ?? undefined,
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

export async function saveTelegram(formData: FormData) {
  await requireAdmin();
  const current = await getPrivateSetting<TelegramSettings>("telegram");
  const token = str(formData, "bot_token");
  if (token && token !== "-" && !/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token)) redirect("/admin/integrations?msg=bad-telegram-token#telegram");
  const chat = str(formData, "chat_id").replace(/\s/g, "");
  if (chat && !/^(-?\d{3,20}|@[A-Za-z0-9_]{4,40})$/.test(chat)) redirect("/admin/integrations?msg=bad-telegram-chat#telegram");
  const next: TelegramSettings = {
    bot_token: token === "-" ? undefined : token || current.bot_token,
    chat_id: chat || undefined,
    off: TELEGRAM_EVENTS.filter((e) => formData.get(`ev_${e}`) !== "on"),
  };
  await save("telegram", next);
  redirect("/admin/integrations?msg=saved#telegram");
}

export async function testTelegram() {
  await requireAdmin();
  const s = await getPrivateSetting<TelegramSettings>("telegram");
  const r = await sendTelegram(s, "✅ <b>Green Wild Zoo</b>\nការភ្ជាប់ Telegram ដំណើរការហើយ។ The Telegram connection works.");
  redirect(`/admin/integrations?tg=${r.ok ? "ok" : "fail"}&detail=${encodeURIComponent(r.ok ? "Test message sent ✓" : r.error ?? "")}#telegram`);
}

/** Lists the chats that recently wrote to the bot, so the admin can pick the group. */
export async function findTelegramChats() {
  await requireAdmin();
  const s = await getPrivateSetting<TelegramSettings>("telegram");
  if (!s.bot_token) redirect("/admin/integrations?tg=fail&detail=" + encodeURIComponent("Save the bot token first.") + "#telegram");
  const r = await recentChats(s.bot_token!);
  if (!r.ok) redirect(`/admin/integrations?tg=fail&detail=${encodeURIComponent(r.error)}#telegram`);
  const list = r.chats.map((c) => `${c.name || "?"} = ${c.id}`).join(" · ");
  redirect(`/admin/integrations?tg=chats&detail=${encodeURIComponent(list || "No chats yet: add the bot to your group and send any message there, then try again.")}#telegram`);
}
