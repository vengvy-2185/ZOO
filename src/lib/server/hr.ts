import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPrivateSetting } from "./private-settings";
import { CANONICAL_URL } from "@/lib/site";
import type { staffAccess } from "./staff";

// Hiring: open jobs, applications (with a CV), the HR team's work, and the
// applicant's own Telegram chat with the recruitment bot, where they check
// their status, interview and result, ask HR questions, and — once hired —
// get their staff sign-in.

export type HrStatus = "new" | "screening" | "interview" | "offer" | "hired" | "rejected" | "withdrawn";
export const HR_STATUS: Record<HrStatus, { km: string; en: string; tone: string; emoji: string }> = {
  new: { km: "ពាក្យថ្មី", en: "New", tone: "bg-sky-100 text-sky-800", emoji: "🆕" },
  screening: { km: "កំពុងពិនិត្យ", en: "Reviewing", tone: "bg-amber-100 text-amber-800", emoji: "🔎" },
  interview: { km: "សម្ភាសន៍", en: "Interview", tone: "bg-violet-100 text-violet-800", emoji: "📅" },
  offer: { km: "ជាប់ · រង់ចាំចូលធ្វើការ", en: "Passed · offer", tone: "bg-emerald-100 text-emerald-800", emoji: "🎉" },
  hired: { km: "ក្លាយជាបុគ្គលិក", en: "Hired", tone: "bg-emerald-600 text-white", emoji: "✅" },
  rejected: { km: "មិនជាប់", en: "Not selected", tone: "bg-slate-200 text-slate-700", emoji: "📭" },
  withdrawn: { km: "ដកពាក្យវិញ", en: "Withdrawn", tone: "bg-slate-100 text-slate-500", emoji: "↩️" },
};

export interface HrSettings {
  /** 1) applications go into the HR panel (the careers page is open) */
  accept?: boolean;
  /** 2) applicants are linked to the Telegram recruitment bot */
  telegram_on?: boolean;
  bot_token?: string;
  bot_username?: string;
  webhook_secret?: string;
  contact?: string; // phone / place people can contact HR
  /** the HR team's own group (or person) with the HR bot — not the staff notification group */
  hr_chat_id?: string;
  /** one-time code to link that group: send "/link <code>" in it */
  link_code?: string;
}
export async function hrSettings(): Promise<HrSettings> {
  const s = await getPrivateSetting<HrSettings>("hr");
  return { accept: s.accept !== false, telegram_on: Boolean(s.telegram_on), ...s };
}
export const canHr = (access: Awaited<ReturnType<typeof staffAccess>>) => access.ok && (access.admin || access.perms.has("hr"));

export const site = () => CANONICAL_URL.replace(/\/$/, "");
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
export const dt = (iso: string | null | undefined, km: boolean) =>
  iso ? new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso)) : "";

/** One call to the recruitment bot (never throws). */
export async function bot(method: string, body: Record<string, unknown>, token?: string) {
  const t = token ?? (await hrSettings()).bot_token;
  if (!t) return { ok: false, description: "no bot" } as any;
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(6000), cache: "no-store" });
    return await r.json();
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : "network" };
  }
}

type App = { id: string; code: string; full_name: string; status: HrStatus; tg_chat_id: number | null; tg_lang: string; staff_user_id: string | null };

/** The applicant's menu of buttons in the bot. */
/** The bot's menu buttons: always shown under the chat box (like a keypad), each in its own colour. */
export const BOT_ACTIONS = {
  status: { km: "📄 ស្ថានភាពពាក្យ", en: "📄 My application", style: "primary" },
  interview: { km: "📅 ការសម្ភាសន៍", en: "📅 Interview", style: "success" },
  result: { km: "🏆 លទ្ធផល", en: "🏆 Result", style: "success" },
  ask: { km: "💬 សួរ HR", en: "💬 Ask HR", style: "danger" },
  jobs: { km: "💼 ការងារទំនេរ", en: "💼 Open jobs", style: "primary" },
  contact: { km: "📞 ទំនាក់ទំនង", en: "📞 Contact", style: "primary" },
  account: { km: "🔐 គណនីបុគ្គលិករបស់ខ្ញុំ", en: "🔐 My staff account", style: "success" },
  "lang:en": { km: "🌐 English", en: "🌐 English", style: undefined },
  "lang:km": { km: "🌐 ភាសាខ្មែរ", en: "🌐 ភាសាខ្មែរ", style: undefined },
} as const;
export type BotAction = keyof typeof BOT_ACTIONS;

/** Which button was pressed (a menu button arrives as its text, in either language). */
export function botAction(text: string): BotAction | null {
  const t = text.trim();
  for (const [k, v] of Object.entries(BOT_ACTIONS)) if (t === v.km || t === v.en) return k as BotAction;
  return null;
}

export function menu(a: Pick<App, "status" | "tg_lang">) {
  const km = a.tg_lang !== "en";
  const b = (k: BotAction) => {
    const v = BOT_ACTIONS[k];
    return { text: km ? v.km : v.en, ...(v.style ? { style: v.style } : {}) };
  };
  const rows = [[b("status"), b("interview")], [b("result"), b("ask")], [b("jobs"), b("contact")]];
  if (a.status === "hired") rows.unshift([b("account")]);
  rows.push([b(km ? "lang:en" : "lang:km")]);
  return {
    keyboard: rows,
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: km ? "ចុចម៉ឺនុយ ឬសរសេរសំណួរ…" : "Tap a button or type a question…",
  };
}

/** A message to one applicant in Telegram (if they linked the bot and it is on). */
export async function tellApplicant(a: App, text: string, withMenu = true) {
  const s = await hrSettings();
  if (!s.telegram_on || !s.bot_token || !a.tg_chat_id) return false;
  const r = await bot("sendMessage", { chat_id: a.tg_chat_id, text: text.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true, ...(withMenu ? { reply_markup: menu(a) } : {}) }, s.bot_token);
  return Boolean(r?.ok);
}

/** What the applicant sees for "📄 My application" (also used after each change). */
export async function statusText(applicantId: string) {
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("*, job:hr_jobs(title, title_km)").eq("id", applicantId).maybeSingle();
  if (!a) return "";
  const km = a.tg_lang !== "en";
  const st = HR_STATUS[a.status as HrStatus];
  const job = (km && a.job?.title_km) || a.job?.title || "—";
  const steps: HrStatus[] = ["new", "screening", "interview", "offer", "hired"];
  const at = steps.indexOf(a.status);
  const bar = steps.map((x, i) => (at >= i ? "🟢" : "⚪️")).join("");
  return [
    `<b>${km ? "ពាក្យសុំការងារ" : "Application"} ${esc(a.code)}</b>`,
    `💼 ${esc(job)}`,
    `${st.emoji} ${km ? "ស្ថានភាព" : "Status"}: <b>${esc(km ? st.km : st.en)}</b>`,
    at >= 0 ? bar : "",
    a.interview_at && a.status === "interview" ? `📅 ${esc(dt(a.interview_at, km))}${a.interview_place ? ` · ${esc(a.interview_place)}` : ""}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Tells the applicant about a change made by HR (status, interview, result…). */
export async function announce(applicantId: string, kind: "status" | "interview" | "offer" | "rejected" | "hired" | "message", extra?: string) {
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("id, code, full_name, status, tg_chat_id, tg_lang, staff_user_id, interview_at, interview_place, interview_note, result_note").eq("id", applicantId).maybeSingle();
  if (!a?.tg_chat_id) return false;
  const km = a.tg_lang !== "en";
  const s = await hrSettings();
  let text = "";
  if (kind === "interview")
    text = km
      ? `📅 <b>អញ្ជើញមកសម្ភាសន៍</b>\n\nសួស្តី ${esc(a.full_name)}!\nពេលវេលា៖ <b>${esc(dt(a.interview_at, true))}</b>${a.interview_place ? `\nទីកន្លែង៖ <b>${esc(a.interview_place)}</b>` : ""}${a.interview_note ? `\n\n📝 ${esc(a.interview_note)}` : ""}\n\nសូមយកអត្តសញ្ញាណប័ណ្ណមកជាមួយ។ ប្រសិនបើមិនអាចមកបាន សូមចុច «💬 សួរ HR»។`
      : `📅 <b>Interview invitation</b>\n\nHello ${esc(a.full_name)}!\nWhen: <b>${esc(dt(a.interview_at, false))}</b>${a.interview_place ? `\nWhere: <b>${esc(a.interview_place)}</b>` : ""}${a.interview_note ? `\n\n📝 ${esc(a.interview_note)}` : ""}\n\nPlease bring your ID card. If you can't come, tap "💬 Ask HR".`;
  else if (kind === "offer")
    text = km
      ? `🎉 <b>អបអរសាទរ!</b>\n\n${esc(a.full_name)} អ្នកបានជាប់ការជ្រើសរើស។${a.result_note ? `\n\n📝 ${esc(a.result_note)}` : ""}\n\nHR នឹងទាក់ទងអ្នកអំពីថ្ងៃចូលធ្វើការ។`
      : `🎉 <b>Congratulations!</b>\n\n${esc(a.full_name)}, you have been selected.${a.result_note ? `\n\n📝 ${esc(a.result_note)}` : ""}\n\nHR will contact you about your first day.`;
  else if (kind === "rejected")
    text = km
      ? `📭 សួស្តី ${esc(a.full_name)}\n\nអរគុណដែលបានដាក់ពាក្យ។ លើកនេះយើងមិនអាចជ្រើសរើសអ្នកបានទេ។${a.result_note ? `\n\n📝 ${esc(a.result_note)}` : ""}\n\nសូមតាមដាន «💼 ការងារទំនេរ» សម្រាប់ឱកាសថ្មីៗ។`
      : `📭 Hello ${esc(a.full_name)}\n\nThank you for applying. We can't offer you this job this time.${a.result_note ? `\n\n📝 ${esc(a.result_note)}` : ""}\n\nKeep an eye on "💼 Open jobs" for new chances.`;
  else if (kind === "hired")
    text = km
      ? `✅ <b>សូមស្វាគមន៍មកកាន់ក្រុម Green Wild Zoo!</b>\n\nឥឡូវអ្នកជាបុគ្គលិករបស់យើងហើយ។\n${extra ?? ""}\n\nចូលប្រព័ន្ធបុគ្គលិក៖ ${site()}/staff/login\nសូមប្តូរពាក្យសម្ងាត់ក្រោយចូលលើកដំបូង (ខ្ញុំ → ពាក្យសម្ងាត់)។`
      : `✅ <b>Welcome to the Green Wild Zoo team!</b>\n\nYou are now one of our staff.\n${extra ?? ""}\n\nStaff sign-in: ${site()}/staff/login\nPlease change your password after the first sign-in (Me → Password).`;
  else if (kind === "message") text = `💬 <b>${km ? "សារពី HR" : "Message from HR"}</b>\n\n${esc(extra ?? "")}`;
  else text = `🔔 ${km ? "មានការផ្លាស់ប្តូរលើពាក្យរបស់អ្នក" : "Your application was updated"}\n\n${await statusText(a.id)}`;
  if (!s.telegram_on) return false;
  return tellApplicant(a as App, text);
}

/** Staff who work on hiring (HR permission) and admins: told about new applications and questions. */
export async function hrTeam() {
  const db = createServiceRoleClient();
  const [{ data: admins }, { data: staff }] = await Promise.all([
    db.from("profiles").select("id").eq("role", "admin"),
    db.from("staff_members").select("user_id, position:staff_positions(permissions)").eq("status", "active"),
  ]);
  return [...(admins ?? []).map((a: any) => a.id as string), ...((staff ?? []) as any[]).filter((s) => (s.position?.permissions ?? []).includes("hr")).map((s) => s.user_id as string)];
}

export async function logEvent(applicantId: string, kind: string, note?: string | null, authorId?: string | null) {
  await createServiceRoleClient().from("hr_events").insert({ applicant_id: applicantId, kind, note: note ?? null, author_id: authorId ?? null });
}

/** News for the HR team (new application, a question) — through the HR bot, to the HR group only. */
export async function notifyHr(html: string) {
  const s = await hrSettings();
  if (!s.bot_token || !s.hr_chat_id) return false;
  const r = await bot("sendMessage", { chat_id: s.hr_chat_id, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }, s.bot_token);
  return Boolean(r?.ok);
}
