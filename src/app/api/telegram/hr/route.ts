import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { bot, botAction, dt, esc, hrSettings, hrTeam, menu, notifyHr, site, statusText, HR_STATUS, type HrStatus } from "@/lib/server/hr";
import { sendPush } from "@/lib/server/push";
import { getPrivateSetting } from "@/lib/server/private-settings";

// The recruitment bot. Telegram sends every message / button press here,
// with the secret we gave it when connecting (anything without it is
// refused). An applicant links their chat by opening the bot from the
// "Open Telegram" button after applying (/start <private token>).

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(req: Request) {
  const s = await hrSettings();
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!s.webhook_secret || !same(secret, s.webhook_secret)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!s.telegram_on || !s.bot_token) return NextResponse.json({ ok: true });
  const u = await req.json().catch(() => null);
  try {
    if (u?.message && (await linkHrGroup(u.message))) return NextResponse.json({ ok: true });
    if (u?.message) await onMessage(u.message);
    else if (u?.callback_query) await onButton(u.callback_query);
  } catch (e) {
    console.warn("hr bot:", e);
  }
  // Telegram only needs a quick "got it"
  return NextResponse.json({ ok: true });
}

const db = () => createServiceRoleClient();

/** "/link 123456" sent in the HR team's group (with the one-time code from Admin): that group gets the HR news. */
async function linkHrGroup(m: any) {
  const code = String(m.text ?? "").trim().match(/^\/link(?:@\w+)?\s+(\d{6})$/)?.[1];
  if (!code || !m.chat?.id) return false;
  const s = await hrSettings();
  if (!s.link_code || code !== s.link_code) {
    await send(m.chat.id, "❌ លេខកូដមិនត្រឹមត្រូវ · Wrong code");
    return true;
  }
  const cur = await getPrivateSetting<Record<string, unknown>>("hr");
  await db().from("private_settings").upsert({ key: "hr", value: { ...cur, hr_chat_id: String(m.chat.id), link_code: null }, updated_at: new Date().toISOString() });
  await send(m.chat.id, "✅ ក្រុមនេះនឹងទទួលដំណឹង HR (ពាក្យសុំថ្មី សំណួរបេក្ខជន)។\n✅ This chat now gets HR news (new applications, questions).");
  return true;
}
const byChat = async (chatId: number) => (await db().from("hr_applicants").select("*").eq("tg_chat_id", chatId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
const send = (chat_id: number, text: string, reply_markup?: unknown) => bot("sendMessage", { chat_id, text: text.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });

async function welcomeStranger(chatId: number, lang: string) {
  const km = !lang?.startsWith("en");
  return send(
    chatId,
    km
      ? `🐘 <b>សួស្តី! នេះជា Bot ជ្រើសរើសបុគ្គលិករបស់ Green Wild Zoo</b>\n\nដាក់ពាក្យធ្វើការនៅ ${site()}/careers\nបន្ទាប់ពីដាក់ពាក្យ ចុចប៊ូតុង «បើក Telegram» ដើម្បីភ្ជាប់ពាក្យរបស់អ្នកមកទីនេះ។`
      : `🐘 <b>Hello! This is the Green Wild Zoo hiring bot</b>\n\nApply for a job at ${site()}/careers\nAfter applying, press "Open Telegram" to link your application here.`,
    { inline_keyboard: [[{ text: km ? "💼 មើលការងារទំនេរ" : "💼 See open jobs", url: `${site()}/careers` }]] }
  );
}

async function onMessage(m: any) {
  const chatId: number = m.chat?.id;
  if (!chatId || m.chat?.type !== "private") return;
  const text = String(m.text ?? "").trim();
  const start = text.match(/^\/start(?:\s+([0-9a-f-]{36}))?$/i);
  if (start) {
    if (!start[1]) {
      const a = await byChat(chatId);
      return a ? send(chatId, await statusText(a.id), menu(a)) : welcomeStranger(chatId, m.from?.language_code);
    }
    // link this chat to the application (the private token proves it's theirs)
    const { data: a } = await db().from("hr_applicants").update({ tg_chat_id: chatId, tg_username: m.from?.username ?? null, tg_lang: m.from?.language_code?.startsWith("en") ? "en" : "km", updated_at: new Date().toISOString() }).eq("token", start[1]).select("*").maybeSingle();
    if (!a) return welcomeStranger(chatId, m.from?.language_code);
    const km = a.tg_lang !== "en";
    await send(chatId, km ? `🎉 សួស្តី <b>${esc(a.full_name)}</b>!\nពាក្យ ${esc(a.code)} របស់អ្នកបានភ្ជាប់ជាមួយ Telegram ហើយ។ យើងនឹងផ្ញើដំណឹងមកទីនេះ។` : `🎉 Hello <b>${esc(a.full_name)}</b>!\nYour application ${esc(a.code)} is now linked. We'll message you here.`);
    return send(chatId, await statusText(a.id), menu(a));
  }
  const a = await byChat(chatId);
  if (!a) return welcomeStranger(chatId, m.from?.language_code);
  const km = a.tg_lang !== "en";
  if (!text) return send(chatId, km ? "សូមសរសេរជាអក្សរ 🙏" : "Please send text 🙏", menu(a));
  // a menu button (it arrives as its own text), not a question
  const act = botAction(text);
  if (act) return doAction(chatId, a, act);
  // anything they write is a question for HR
  await db().from("hr_messages").insert({ applicant_id: a.id, body: text.slice(0, 2000) });
  await db().from("hr_applicants").update({ tg_state: null, updated_at: new Date().toISOString() }).eq("id", a.id);
  await sendPush(await hrTeam(), { title: `❓ សំណួរពី ${a.full_name} · ${a.code}`, body: text.slice(0, 140), url: `/staff/hr/${a.id}`, tag: `hr-q-${a.id}` }).catch(() => {});
  await notifyHr(`❓ <b>សំណួរពីបេក្ខជន</b> ${esc(a.code)}\n👤 ${esc(a.full_name)}\n💬 ${esc(text.slice(0, 500))}\n\n${site()}/staff/hr/${a.id}`);
  return send(chatId, km ? "✅ បានផ្ញើសំណួរទៅ HR ហើយ។ យើងនឹងឆ្លើយតបមកទីនេះឆាប់ៗ។" : "✅ Sent to HR. We'll answer here soon.", menu(a));
}

async function onButton(q: any) {
  const chatId: number = q.message?.chat?.id;
  const data = String(q.data ?? "");
  await bot("answerCallbackQuery", { callback_query_id: q.id });
  if (!chatId) return;
  const a = await byChat(chatId);
  if (!a) return welcomeStranger(chatId, q.from?.language_code);
  return doAction(chatId, a, data);
}

async function doAction(chatId: number, a: any, data: string) {
  if (data.startsWith("lang:")) {
    const lang = data === "lang:en" ? "en" : "km";
    await db().from("hr_applicants").update({ tg_lang: lang }).eq("id", a.id);
    a = { ...a, tg_lang: lang };
    await send(chatId, lang === "en" ? "🌐 Language: English" : "🌐 ភាសា៖ ខ្មែរ", menu(a));
    return send(chatId, await statusText(a.id));
  }
  const km = a.tg_lang !== "en";
  const { data: job } = a.job_id ? await db().from("hr_jobs").select("title, title_km").eq("id", a.job_id).maybeSingle() : { data: null };
  switch (data) {
    case "status":
      return send(chatId, await statusText(a.id), menu(a));
    case "interview":
      return send(
        chatId,
        a.interview_at
          ? km
            ? `📅 <b>ការសម្ភាសន៍</b>\n${esc(dt(a.interview_at, true))}${a.interview_place ? `\n📍 ${esc(a.interview_place)}` : ""}${a.interview_note ? `\n📝 ${esc(a.interview_note)}` : ""}`
            : `📅 <b>Interview</b>\n${esc(dt(a.interview_at, false))}${a.interview_place ? `\n📍 ${esc(a.interview_place)}` : ""}${a.interview_note ? `\n📝 ${esc(a.interview_note)}` : ""}`
          : km
            ? "📅 មិនទាន់មានការណាត់សម្ភាសន៍នៅឡើយទេ។ HR នឹងផ្ញើមកទីនេះ។"
            : "📅 No interview yet. HR will message you here.",
        menu(a)
      );
    case "result": {
      const st = a.status as HrStatus;
      const done = st === "offer" || st === "hired" || st === "rejected";
      return send(
        chatId,
        done
          ? `${HR_STATUS[st].emoji} <b>${esc(km ? HR_STATUS[st].km : HR_STATUS[st].en)}</b>${a.result_note ? `\n\n📝 ${esc(a.result_note)}` : ""}`
          : km
            ? "⏳ មិនទាន់មានលទ្ធផលទេ។ យើងនឹងប្រាប់អ្នកភ្លាមៗនៅពេលមាន។"
            : "⏳ No result yet. We'll tell you as soon as there is one.",
        menu(a)
      );
    }
    case "ask":
      await db().from("hr_applicants").update({ tg_state: "ask" }).eq("id", a.id);
      return send(chatId, km ? "💬 សូមសរសេរសំណួររបស់អ្នក ហើយផ្ញើមក។ HR នឹងឆ្លើយតបនៅទីនេះ។" : "💬 Type your question and send it. HR will answer here.");
    case "jobs": {
      const { data: jobs } = await db().from("hr_jobs").select("slug, title, title_km").eq("open", true).order("sort").limit(8);
      if (!jobs?.length) return send(chatId, km ? "មិនទាន់មានការងារទំនេរផ្សេងទៀតទេ។" : "No other open jobs right now.", menu(a));
      return send(chatId, km ? "💼 <b>ការងារទំនេរ</b>" : "💼 <b>Open jobs</b>", { inline_keyboard: jobs.map((j: any) => [{ text: (km && j.title_km) || j.title, url: `${site()}/careers/${j.slug}` }]) });
    }
    case "contact": {
      const s = await hrSettings();
      return send(chatId, `📞 <b>${km ? "ទំនាក់ទំនង HR" : "Contact HR"}</b>\n${esc(s.contact || (km ? "សូមចុច «💬 សួរ HR» ដើម្បីផ្ញើសារ។" : 'Tap "💬 Ask HR" to send a message.'))}\n\n🌐 ${site()}`, menu(a));
    }
    case "account": {
      if (a.status !== "hired" || !a.staff_user_id) return send(chatId, km ? "គណនីបុគ្គលិកនឹងមាន ក្រោយពេលអ្នកចូលធ្វើការ។" : "Your staff account comes once you are hired.", menu(a));
      const { data: st } = await db().from("staff_members").select("staff_no").eq("user_id", a.staff_user_id).maybeSingle();
      return send(chatId, km ? `🔐 <b>គណនីបុគ្គលិក</b>\nលេខសម្គាល់៖ <b>${esc(st?.staff_no)}</b>\nចូល៖ ${site()}/staff/login\n\nភ្លេចពាក្យសម្ងាត់? សូមចុច «💬 សួរ HR»។` : `🔐 <b>Staff account</b>\nStaff ID: <b>${esc(st?.staff_no)}</b>\nSign in: ${site()}/staff/login\n\nForgot the password? Tap "💬 Ask HR".`, menu(a));
    }
    default:
      return send(chatId, await statusText(a.id), menu(a));
  }
}
