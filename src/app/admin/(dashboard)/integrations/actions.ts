"use server";

import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { getPrivateSetting, serviceClient, TELEGRAM_EVENTS, type PaymentSettings, type TelegramSettings, type TtsSettings, type TurnSettings } from "@/lib/server/private-settings";
import { iceServers, forgetIce } from "@/lib/server/ice";
import { recentChats, sendTelegram } from "@/lib/server/telegram";
import { checkAccount } from "@/lib/server/bakong";
import { resolveImage } from "@/lib/admin/upload";

import { audit } from "@/lib/server/audit";
import { getI18n } from "@/lib/i18n/server";

/** The admin's language for the little result notes. */
const T = (en: string, kh: string) => (getI18n().locale === "km" ? kh : en);
// Server actions run as POST requests to the admin page, so they re-check
// the admin role themselves before touching secrets with the service role.
async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function save(key: "payment" | "tts" | "telegram" | "turn" | "hr", value: object) {
  const { error } = await serviceClient().from("private_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function savePayment(formData: FormData) {
  await requireAdmin();
  await audit("settings.payment", "private_settings");
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
  await audit("settings.tts", "private_settings");
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
  await audit("settings.telegram", "private_settings");
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
  redirect(`/admin/integrations?tg=${r.ok ? "ok" : "fail"}&detail=${encodeURIComponent(r.ok ? T("Test message sent ✓", "បានផ្ញើសារសាកល្បង ✓") : r.error ?? "")}#telegram`);
}

/** Lists the chats that recently wrote to the bot, so the admin can pick the group. */
export async function findTelegramChats() {
  await requireAdmin();
  const s = await getPrivateSetting<TelegramSettings>("telegram");
  if (!s.bot_token) redirect("/admin/integrations?tg=fail&detail=" + encodeURIComponent(T("Save the bot token first.", "សូមរក្សា Bot token ជាមុនសិន។")) + "#telegram");
  const r = await recentChats(s.bot_token!);
  if (!r.ok) redirect(`/admin/integrations?tg=fail&detail=${encodeURIComponent(r.error)}#telegram`);
  const list = r.chats.map((c) => `${c.name || "?"} = ${c.id}`).join(" · ");
  redirect(`/admin/integrations?tg=chats&detail=${encodeURIComponent(list || T("No chats yet: add the bot to your group and send any message there, then try again.", "មិនទាន់មាន chat ទេ៖ សូមបញ្ចូល bot ទៅក្នុងក្រុម ហើយផ្ញើសារណាមួយ រួចសាកម្តងទៀត។"))}#telegram`);
}

export async function saveTurn(formData: FormData) {
  await requireAdmin();
  await audit("settings.turn", "private_settings");
  const cur = await getPrivateSetting<TurnSettings>("turn");
  const keep = (name: "metered_key" | "cf_token" | "credential") => (str(formData, name) === "-" ? undefined : str(formData, name) || cur[name]);
  const provider = (["none", "metered", "cloudflare", "custom"] as const).find((x) => x === str(formData, "provider")) ?? "none";
  await save("turn", {
    provider,
    metered_app: str(formData, "metered_app").replace(/\.metered\.live.*$/i, "").replace(/^https?:\/\//, "") || undefined,
    metered_key: keep("metered_key"),
    cf_key_id: str(formData, "cf_key_id") || undefined,
    cf_token: keep("cf_token"),
    url: str(formData, "url") || undefined,
    username: str(formData, "username") || undefined,
    credential: keep("credential"),
  } satisfies TurnSettings);
  forgetIce();
  redirect("/admin/integrations?msg=saved#turn");
}

export async function testTurn() {
  await requireAdmin();
  forgetIce();
  const list = await iceServers();
  const turn = list.filter((x) => [x.urls].flat().some((u) => String(u).startsWith("turn")));
  redirect(`/admin/integrations?test=${turn.length ? "ok" : "fail"}&detail=${encodeURIComponent(turn.length ? T(`TURN server answered ✓ (${[turn[0].urls].flat().length} addresses). Calls can now pass through it.`, `TURN server ឆ្លើយតប ✓ (${[turn[0].urls].flat().length} អាសយដ្ឋាន)។ ការហៅអាចឆ្លងកាត់វាបានហើយ។`) : T("No TURN server: check the provider, app name and key.", "គ្មាន TURN server ទេ៖ សូមពិនិត្យអ្នកផ្តល់សេវា ឈ្មោះ app និង key។"))}#turn`);
}

/** Hiring: 1) applications go to the HR panel, 2) applicants talk to the Telegram bot. */
export async function saveHr(formData: FormData) {
  await requireAdmin();
  await audit("settings.hr", "private_settings");
  const { hrSettings } = await import("@/lib/server/hr");
  const cur = await hrSettings();
  const token = str(formData, "bot_token");
  if (token && token !== "-" && !/^\d{5,}:[\w-]{20,}$/.test(token)) redirect("/admin/integrations?msg=bad-telegram-token#hr");
  await save("hr", {
    ...cur,
    accept: formData.get("accept") === "on",
    telegram_on: formData.get("telegram_on") === "on",
    contact: str(formData, "contact").slice(0, 300) || undefined,
    bot_token: token === "-" ? undefined : token || cur.bot_token,
    ...(token && token !== cur.bot_token ? { bot_username: undefined } : {}),
  });
  redirect("/admin/integrations?msg=saved#hr");
}

/** A new one-time code to link (another) HR group; the old link stops getting HR news. */
export async function newHrGroupCode() {
  await requireAdmin();
  const { hrSettings } = await import("@/lib/server/hr");
  const cur = await hrSettings();
  await save("hr", { ...cur, hr_chat_id: null, link_code: String(Math.floor(100000 + Math.random() * 900000)) });
  redirect("/admin/integrations?msg=saved#hr");
}

/** Tells Telegram to send the bot's messages to this website (with a secret only we know). */
export async function connectHrBot() {
  await requireAdmin();
  const { hrSettings, bot, site, BOT_COMMANDS } = await import("@/lib/server/hr");
  const cur = await hrSettings();
  if (!cur.bot_token) redirect(`/admin/integrations?test=fail&detail=${encodeURIComponent(T("Add the bot token first.", "សូមបញ្ចូល Bot token ជាមុនសិន។"))}#hr`);
  const me = await bot("getMe", {}, cur.bot_token);
  if (!me?.ok) redirect(`/admin/integrations?test=fail&detail=${encodeURIComponent(T(`Telegram refused the token: ${me?.description ?? "error"}`, `Telegram មិនទទួល token នេះទេ៖ ${me?.description ?? "error"}`))}#hr`);
  const secret = crypto.randomUUID().replace(/-/g, "");
  const r = await bot("setWebhook", { url: `${site()}/api/telegram/hr`, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: true }, cur.bot_token);
  if (!r?.ok) redirect(`/admin/integrations?test=fail&detail=${encodeURIComponent(T(`Could not connect: ${r?.description ?? "error"}`, `ភ្ជាប់មិនបាន៖ ${r?.description ?? "error"}`))}#hr`);
  await bot("setMyCommands", { commands: BOT_COMMANDS, scope: { type: "all_private_chats" } }, cur.bot_token);
  await bot("setChatMenuButton", { menu_button: { type: "commands" } }, cur.bot_token);
  // a one-time code to link the HR team's own group (send "/link <code>" there)
  const linkCode = String(Math.floor(100000 + Math.random() * 900000));
  await save("hr", { ...cur, bot_username: me.result.username, webhook_secret: secret, telegram_on: true, link_code: cur.hr_chat_id ? cur.link_code : linkCode });
  redirect(`/admin/integrations?test=ok&detail=${encodeURIComponent(T(`Connected ✓ @${me.result.username} now answers applicants.`, `បានភ្ជាប់ ✓ @${me.result.username} ឥឡូវឆ្លើយតបបេក្ខជនហើយ។`))}#hr`);
}
