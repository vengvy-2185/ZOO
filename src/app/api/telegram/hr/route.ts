import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { applyAgain, bot, botAction, guestMenu, interviewMapUrl, logEvent, dt, esc, hrSettings, hrTeam, menu, notifyHr, site, statusText, HR_STATUS, type HrStatus } from "@/lib/server/hr";
import { sendPush } from "@/lib/server/push";
import { getPrivateSetting } from "@/lib/server/private-settings";
import { allow } from "@/lib/server/rate-limit";

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
  // only a group: each applicant's private chat shows only their own application
  if (m.chat.type !== "group" && m.chat.type !== "supergroup") {
    await send(m.chat.id, "⚠️ សូមផ្ញើ /link ក្នុង <b>ក្រុម HR</b> (Group) មិនមែនក្នុង chat ផ្ទាល់ខ្លួនទេ។ Chat ផ្ទាល់ខ្លួនសម្រាប់បេក្ខជន ឃើញតែពាក្យរបស់ខ្លួនប៉ុណ្ណោះ។\n\n⚠️ Send /link inside the <b>HR team's group</b>, not in a private chat. Private chats are for applicants and show only their own application.");
    return true;
  }
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
      ? `🐘 <b>សួស្តី! នេះជា Bot ជ្រើសរើសបុគ្គលិករបស់ Green Wild Zoo</b>\n\n• <b>💼 ការងារទំនេរ</b> — មើលការងារដែលកំពុងរើស\n• <b>📝 ដាក់ពាក្យធ្វើការ</b> — បំពេញពាក្យ និងភ្ជាប់ CV\n• <b>🔗 ភ្ជាប់ពាក្យដែលបានដាក់</b> — បើអ្នកបានដាក់ពាក្យរួច ដើម្បីតាមដានការសម្ភាសន៍ លទ្ធផល និងសួរ HR នៅទីនេះ`
      : `🐘 <b>Hello! This is the Green Wild Zoo hiring bot</b>\n\n• <b>💼 Open jobs</b> — see who we're hiring\n• <b>📝 Apply for a job</b> — fill in the form with your CV\n• <b>🔗 Link my application</b> — if you already applied: follow your interview and result, and ask HR here`,
    guestMenu(km)
  );
}

/** Someone not linked yet pressed a button (or typed "HR-0001 012345678"). */
async function onGuest(chatId: number, m: any, text: string) {
  const km = !String(m.from?.language_code ?? "").startsWith("en");
  const act = botAction(text) ?? cmd(text);
  if (act === "jobs") return jobsList(chatId, km, guestMenu(km));
  if (act === "apply")
    return send(chatId, km ? "📝 ចុចប៊ូតុងខាងក្រោម ដើម្បីជ្រើសការងារ និងដាក់ពាក្យ។ ក្រោយដាក់ពាក្យ ចុច «បើក Telegram» ដើម្បីភ្ជាប់មកទីនេះ។" : '📝 Tap below to choose a job and apply. After applying, press "Open Telegram" to link it here.', {
      inline_keyboard: [[{ text: km ? "📝 ដាក់ពាក្យឥឡូវ" : "📝 Apply now", url: `${site()}/careers`, style: "success" }]],
    });
  if (act === "contact") {
    const s = await hrSettings();
    return send(chatId, `📞 <b>${km ? "ទំនាក់ទំនង HR" : "Contact HR"}</b>\n${esc(s.contact || "—")}\n\n🌐 ${site()}/careers`, guestMenu(km));
  }
  if (act === "link")
    return send(
      chatId,
      km
        ? "🔗 សូមផ្ញើ <b>លេខកូដពាក្យ</b> និង <b>លេខទូរស័ព្ទ</b> ដែលបានសរសេរក្នុងពាក្យ ដូចនេះ៖\n\n<code>HR-0012 012345678</code>\n\n(លេខកូដមាននៅទំព័រ «បានទទួលពាក្យ» ក្រោយពេលដាក់ពាក្យ)"
        : "🔗 Send your <b>application code</b> and the <b>phone number</b> you applied with, like this:\n\n<code>HR-0012 012345678</code>\n\n(the code is on the thank-you page after applying)",
      guestMenu(km)
    );
  const code = text.match(/\bHR-?(\d{3,6})\b/i);
  if (code) {
    if (!(await allow("hr-tg-link", 6, 3600, String(chatId)))) return send(chatId, km ? "⏳ ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច។" : "⏳ Too many tries. Please wait a while.", guestMenu(km));
    const digits = (x: string) => x.replace(/\D/g, "").replace(/^855/, "").replace(/^0/, "");
    const phone = digits(text.replace(code[0], ""));
    const { data: a } = await db().from("hr_applicants").select("id, phone, tg_chat_id").eq("code", `HR-${code[1].padStart(4, "0")}`).maybeSingle();
    if (!a || phone.length < 7 || digits(a.phone) !== phone)
      return send(chatId, km ? "❌ លេខកូដ ឬលេខទូរស័ព្ទមិនត្រូវគ្នាទេ។ សូមពិនិត្យ ហើយសាកម្តងទៀត។" : "❌ The code or phone number doesn't match. Please check and try again.", guestMenu(km));
    if (a.tg_chat_id && Number(a.tg_chat_id) !== chatId)
      return send(chatId, km ? "⚠️ ពាក្យនេះបានភ្ជាប់ជាមួយ Telegram មួយផ្សេងរួចហើយ។ សូមទាក់ទង HR។" : "⚠️ This application is already linked to another Telegram. Please contact HR.", guestMenu(km));
    const { data: linked } = await db()
      .from("hr_applicants")
      .update({ tg_chat_id: chatId, tg_username: m.from?.username ?? null, tg_lang: km ? "km" : "en", updated_at: new Date().toISOString() })
      .eq("id", a.id)
      .select("*")
      .single();
    await send(chatId, km ? `🎉 បានភ្ជាប់ពាក្យ ${esc(linked.code)} ហើយ! ពីនេះទៅ អ្នកនឹងទទួលដំណឹងការសម្ភាសន៍ និងលទ្ធផលនៅទីនេះ។` : `🎉 Application ${esc(linked.code)} is linked! From now on you get interview and result news here.`, menu(linked));
    return send(chatId, await statusText(linked.id));
  }
  return welcomeStranger(chatId, m.from?.language_code);
}

/** "/status" etc. from the blue Menu button: the same as pressing that button. */
function cmd(text: string): any {
  return text.match(/^\/(status|interview|cv|result|ask|jobs|contact|link|lang|apply)(?:@\w+)?$/i)?.[1]?.toLowerCase() ?? null;
}

async function jobsList(chatId: number, km: boolean, keypad?: unknown) {
  const { data: jobs } = await db().from("hr_jobs").select("slug, title, title_km, salary").eq("open", true).order("sort").limit(10);
  if (!jobs?.length) return send(chatId, km ? "មិនទាន់មានការងារទំនេរទេ។" : "No open jobs right now.", keypad);
  return send(chatId, km ? "💼 <b>ការងារទំនេរ</b>\nចុចលើការងារ ដើម្បីមើលព័ត៌មាន និងដាក់ពាក្យ៖" : "💼 <b>Open jobs</b>\nTap a job to read more and apply:", {
    inline_keyboard: jobs.map((j: any) => [{ text: `${(km && j.title_km) || j.title}${j.salary ? ` · ${j.salary}` : ""}`, url: `${site()}/careers/${j.slug}` }]),
  });
}

async function onMessage(m: any) {
  const chatId: number = m.chat?.id;
  if (!chatId || m.chat?.type !== "private") return;
  const text = String(m.text ?? "").trim();
  const start = text.match(/^\/start(?:\s+([0-9a-f-]{36}))?$/i);
  if (start) {
    if (!start[1]) {
      const a = await byChat(chatId);
      if (!a) return welcomeStranger(chatId, m.from?.language_code);
      await send(chatId, a.tg_lang !== "en" ? `👋 សួស្តី ${esc(a.full_name)}! សូមប្រើម៉ឺនុយខាងក្រោម។` : `👋 Hello ${esc(a.full_name)}! Use the menu below.`, menu(a));
      return send(chatId, await statusText(a.id));
    }
    // link this chat to the application (the private token proves it's theirs)
    const { data: a } = await db().from("hr_applicants").update({ tg_chat_id: chatId, tg_username: m.from?.username ?? null, tg_lang: m.from?.language_code?.startsWith("en") ? "en" : "km", updated_at: new Date().toISOString() }).eq("token", start[1]).select("*").maybeSingle();
    if (!a) return welcomeStranger(chatId, m.from?.language_code);
    const km = a.tg_lang !== "en";
    await send(chatId, km ? `🎉 សួស្តី <b>${esc(a.full_name)}</b>!\nពាក្យ ${esc(a.code)} របស់អ្នកបានភ្ជាប់ជាមួយ Telegram ហើយ។ យើងនឹងផ្ញើដំណឹងមកទីនេះ។` : `🎉 Hello <b>${esc(a.full_name)}</b>!\nYour application ${esc(a.code)} is now linked. We'll message you here.`);
    return send(chatId, await statusText(a.id), menu(a));
  }
  const a = await byChat(chatId);
  if (!a) return onGuest(chatId, m, text);
  const km = a.tg_lang !== "en";
  if (!text) return send(chatId, km ? "សូមសរសេរជាអក្សរ 🙏" : "Please send text 🙏", menu(a));
  // a menu button (it arrives as its own text), not a question
  const act = botAction(text) ?? cmd(text);
  if (act === "lang") return doAction(chatId, a, km ? "lang:en" : "lang:km");
  if (act === "apply") return doAction(chatId, a, "jobs");
  if (act === "link") return send(chatId, km ? `✅ ពាក្យ ${esc(a.code)} បានភ្ជាប់រួចហើយ។` : `✅ Application ${esc(a.code)} is already linked.`, menu(a));
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
  if (data.startsWith("inv:")) return onInvite(chatId, data);
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
    case "cv": {
      if (!a.cv_path) return send(chatId, km ? "📎 មិនមាន CV ទេ។" : "📎 No CV on file.", menu(a));
      const { data: f } = await db().storage.from("hr-files").createSignedUrl(a.cv_path, 600);
      const cap = km ? `📎 CV ដែលអ្នកបានផ្ញើ · ${a.code}` : `📎 The CV you sent · ${a.code}`;
      const r = f?.signedUrl ? await bot("sendDocument", { chat_id: chatId, document: f.signedUrl, caption: cap, reply_markup: menu(a) }) : null;
      if (r?.ok) return;
      // Telegram couldn't fetch it: a private link for 10 minutes instead
      return send(chatId, `${cap}\n${km ? "(តំណនេះប្រើបាន ១០ នាទី)" : "(this link works for 10 minutes)"}`, f?.signedUrl ? { inline_keyboard: [[{ text: km ? "📎 បើក CV" : "📎 Open CV", url: f.signedUrl }]] } : menu(a));
    }
    case "interview": {
      const map = interviewMapUrl(a);
      if (a.interview_at && a.interview_lat != null && a.interview_lng != null)
        await bot("sendVenue", { chat_id: chatId, latitude: a.interview_lat, longitude: a.interview_lng, title: a.interview_place || (km ? "ទីកន្លែងសម្ភាសន៍" : "Interview place"), address: dt(a.interview_at, km) });
      return send(
        chatId,
        a.interview_at
          ? km
            ? `📅 <b>ការសម្ភាសន៍</b>\n${esc(dt(a.interview_at, true))}${a.interview_place ? `\n📍 ${esc(a.interview_place)}` : ""}${a.interview_note ? `\n📝 ${esc(a.interview_note)}` : ""}`
            : `📅 <b>Interview</b>\n${esc(dt(a.interview_at, false))}${a.interview_place ? `\n📍 ${esc(a.interview_place)}` : ""}${a.interview_note ? `\n📝 ${esc(a.interview_note)}` : ""}`
          : km
            ? "📅 មិនទាន់មានការណាត់សម្ភាសន៍នៅឡើយទេ។ HR នឹងផ្ញើមកទីនេះ។"
            : "📅 No interview yet. HR will message you here.",
        a.interview_at && map ? { inline_keyboard: [[{ text: km ? "📍 បើកផែនទី" : "📍 Open the map", url: map, style: "success" }]] } : menu(a)
      );
    }
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
    case "jobs":
      return jobsList(chatId, km);
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

/** A past applicant answers "come back for a new job?" (only from their own chat). */
async function onInvite(chatId: number, data: string) {
  const [, id, ans] = data.split(":");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "")) return;
  const { data: inv } = await db().from("hr_invites").select("*, applicant:hr_applicants!hr_invites_applicant_id_fkey(id, code, full_name, tg_chat_id, tg_lang), job:hr_jobs(id, title, title_km, open)").eq("id", id).maybeSingle();
  const a = inv?.applicant as any;
  if (!inv || !a || Number(a.tg_chat_id) !== chatId) return;
  const km = a.tg_lang !== "en";
  if (inv.status !== "sent") return send(chatId, km ? "អ្នកបានឆ្លើយរួចហើយ។ អរគុណ!" : "You already answered. Thank you!");
  const job = inv.job as any;
  const title = (km && job?.title_km) || job?.title || "";
  if (ans !== "y") {
    await db().from("hr_invites").update({ status: "declined", answered_at: new Date().toISOString() }).eq("id", id).eq("status", "sent");
    await logEvent(a.id, "invite-declined", title);
    await notifyHr(`❌ <b>មិនមកវិញ</b> ${esc(a.code)} · ${esc(a.full_name)}\n💼 ${esc(title)}`);
    return send(chatId, km ? "អរគុណសម្រាប់ការឆ្លើយតប។ សូមជូនពរឲ្យអ្នកជោគជ័យ! 🙏" : "Thank you for answering. We wish you all the best! 🙏");
  }
  if (!job?.open) return send(chatId, km ? "សូមអភ័យទោស ការងារនេះបានបិទហើយ។" : "Sorry, this job has just closed.");
  // claim the invite first, so a double tap makes only one application
  const { data: won } = await db().from("hr_invites").update({ status: "accepted", answered_at: new Date().toISOString() }).eq("id", id).eq("status", "sent").select("id");
  if (!won?.length) return;
  const n = await applyAgain(a.id, job.id, null);
  if (!n) return;
  await db().from("hr_invites").update({ new_applicant_id: n.id }).eq("id", id);
  await sendPush(await hrTeam(), { title: `✅ មកវិញ · ${a.full_name}`, body: `ចង់ធ្វើការ ${title} · ពាក្យថ្មី ${n.code}`, url: `/staff/hr/${n.id}`, tag: `hr-${n.id}` }).catch(() => {});
  await notifyHr(`✅ <b>ចង់មកធ្វើការវិញ</b> ${esc(n.code)}\n👤 ${esc(a.full_name)}\n💼 ${esc(title)}\n\n${site()}/staff/hr/${n.id}`);
  await send(chatId, km ? `🎉 អរគុណ! បានបង្កើតពាក្យថ្មី <b>${esc(n.code)}</b> សម្រាប់ការងារ <b>${esc(title)}</b> ដោយប្រើ CV ពីមុន។ HR នឹងទាក់ទងអ្នកនៅទីនេះ។` : `🎉 Thank you! New application <b>${esc(n.code)}</b> for <b>${esc(title)}</b>, using your earlier CV. HR will contact you here.`, menu(n));
}
