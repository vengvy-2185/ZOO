import "server-only";
import { getPrivateSetting, type TelegramEvent, type TelegramSettings } from "./private-settings";

// Short messages to the zoo's Telegram group (SOS, leave requests, cash
// close, paid bookings…). The bot token stays on the server. A message that
// can't be sent never stops the action that caused it.

/** Escape text for Telegram's HTML mode. */
export const tg = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export async function sendTelegram(settings: TelegramSettings, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!settings.bot_token || !settings.chat_id) return { ok: false, error: "Telegram is not set up." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: settings.chat_id, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    const j = await res.json().catch(() => ({}));
    return j.ok ? { ok: true } : { ok: false, error: j.description ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

/** Sends one piece of news if Telegram is set up and that kind of news is on. */
export async function notify(event: TelegramEvent, html: string) {
  try {
    const s = await getPrivateSetting<TelegramSettings>("telegram");
    if (!s.bot_token || !s.chat_id || (s.off ?? []).includes(event)) return;
    const r = await sendTelegram(s, html);
    if (!r.ok) console.warn("telegram:", event, r.error);
  } catch (e) {
    console.warn("telegram:", event, e);
  }
}

/** The chats that recently wrote to the bot (to find the group's chat id). */
export async function recentChats(token: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    const j = await res.json();
    if (!j.ok) return { ok: false as const, error: String(j.description ?? "error") };
    const seen = new Map<string, string>();
    for (const u of j.result ?? []) {
      const c = u.message?.chat ?? u.my_chat_member?.chat ?? u.channel_post?.chat;
      if (c) seen.set(String(c.id), c.title ?? [c.first_name, c.last_name].filter(Boolean).join(" ") ?? c.username ?? "");
    }
    return { ok: true as const, chats: [...seen].map(([id, name]) => ({ id, name })) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "network error" };
  }
}
