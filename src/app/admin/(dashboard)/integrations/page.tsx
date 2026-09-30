import { PlugZap, QrCode, AudioLines, CheckCircle2, AlertTriangle, ExternalLink, KeyRound, Send, PhoneCall, Briefcase } from "lucide-react";
import { AdminPageHeader, FormSection, Field, SelectField } from "@/components/admin/ui";
import { SubmitButton, ImageUploadField } from "@/components/admin/ui-client";
import { PaymentTest } from "@/components/admin/PaymentTest";
import { bakongUsage } from "@/lib/server/payments";
import { hrSettings } from "@/lib/server/hr";
import { getPrivateSetting, mask, TELEGRAM_EVENTS, type PaymentSettings, type TelegramSettings, type TtsSettings, type TurnSettings } from "@/lib/server/private-settings";
import { getI18n } from "@/lib/i18n/server";
import { savePayment, saveTts, testPayment, saveTelegram, testTelegram, findTelegramChats, saveTurn, testTurn, saveHr, connectHrBot } from "./actions";

const TG_EVENTS: Record<(typeof TELEGRAM_EVENTS)[number], [string, string]> = {
  sos: ["SOS / emergency (always recommended)", "SOS / អាសន្ន (ណែនាំឲ្យបើកជានិច្ច)"],
  leave: ["New leave requests", "ការសុំច្បាប់ថ្មី"],
  issue: ["Problems reported by staff", "បញ្ហាដែលបុគ្គលិករាយការណ៍"],
  supply: ["Urgent supply requests", "ការសុំសម្ភារៈបន្ទាន់"],
  cash: ["Daily cash close (and any difference)", "ការបិទបញ្ជីប្រាក់ប្រចាំថ្ងៃ (និងលុយខុស)"],
  booking: ["Paid online bookings", "ការកក់អនឡាញដែលបានបង់ប្រាក់"],
  sync: ["Work sent in late after the internet came back", "ការងារដែលផ្ញើយឺត ពេល internet មកវិញ"],
};

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams }: { searchParams: { msg?: string; test?: string; tg?: string; detail?: string } }) {
  const km = getI18n().locale === "km";
  const L = (en: string, kh: string) => (km ? kh : en);
  const [pay, tts, tele, usage, turn, hr] = await Promise.all([
    getPrivateSetting<PaymentSettings>("payment"),
    getPrivateSetting<TtsSettings>("tts"),
    getPrivateSetting<TelegramSettings>("telegram"),
    bakongUsage(),
    getPrivateSetting<TurnSettings>("turn"),
    hrSettings(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <AdminPageHeader icon={PlugZap} title={L("Payments, Voice & Telegram", "ការបង់ប្រាក់ សំឡេង និង Telegram")} subtitle={L("Bakong KHQR for tickets and adoptions · natural text-to-speech voices · news to your Telegram group.", "Bakong KHQR សម្រាប់សំបុត្រ និងការឧបត្ថម្ភ · សំឡេងអានធម្មជាតិ · ដំណឹងទៅក្រុម Telegram។")} />

      {searchParams.msg === "saved" && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white">
          <CheckCircle2 size={18} className="text-leaf" /> {L("Saved ✓", "បានរក្សាទុក ✓")}
        </p>
      )}
      {searchParams.msg === "bad-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{L("Not saved: the Bakong account ID looks wrong. It should look like name@aclb or name@abaa (letters/numbers, one @, no dot after it).", "មិនបានរក្សាទុក៖ លេខគណនី Bakong មិនត្រឹមត្រូវ។ វាគួរមានទម្រង់ name@aclb ឬ name@abaa (អក្សរ/លេខ @ មួយ គ្មានចុចក្រោយ @)។")}</p>
      )}
      {searchParams.msg === "email-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {L('Not saved: that is an email address, not a Bakong account ID. Open your bank app (ABA, ACLEDA, Wing…) or the Bakong app → your profile / "Receive" / KHQR, and copy the ID that looks like name@bank (e.g. greenwildzoo@aclb).', "មិនបានរក្សាទុក៖ នោះជាអ៊ីមែល មិនមែនលេខគណនី Bakong ទេ។ បើកកម្មវិធីធនាគារ (ABA, ACLEDA, Wing…) ឬកម្មវិធី Bakong → ប្រវត្តិរូប / «ទទួលប្រាក់» / KHQR ហើយចម្លងលេខដែលមានទម្រង់ name@bank (ឧ. greenwildzoo@aclb)។")}
        </p>
      )}
      {searchParams.msg === "bad-bank-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{L("Not saved: the bank account number should be digits only (6–24 digits).", "មិនបានរក្សាទុក៖ លេខគណនីធនាគារត្រូវជាលេខសុទ្ធ (៦–២៤ ខ្ទង់)។")}</p>
      )}
      {searchParams.msg === "bad-telegram-token" && <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{L("Not saved: a bot token looks like 123456789:AAH… (numbers, a colon, then letters). Copy it again from @BotFather.", "មិនបានរក្សាទុក៖ Bot token មានទម្រង់ 123456789:AAH… (លេខ សញ្ញា : ហើយអក្សរ)។ សូមចម្លងម្តងទៀតពី @BotFather។")}</p>}
      {searchParams.msg === "bad-telegram-chat" && <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{L("Not saved: a chat id is a number like -1001234567890 (groups start with a minus) or @channelname.", "មិនបានរក្សាទុក៖ Chat id ជាលេខដូចជា -1001234567890 (ក្រុមចាប់ផ្តើមដោយសញ្ញាដក) ឬ @channelname។")}</p>}
      {searchParams.test && (
        <p className={`mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${searchParams.test === "ok" ? "bg-light-green text-primary" : "bg-amber-50 text-amber-800"}`}>
          {searchParams.test === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {searchParams.detail}
        </p>
      )}

      <div className="space-y-6">
        {/* ── Bakong KHQR ─────────────────────────────── */}
        <form action={savePayment} autoComplete="off">
          <FormSection icon={QrCode} title={L("Bakong KHQR payments", "ការបង់ប្រាក់ Bakong KHQR")} hint={L("Visitors scan one KHQR with any Cambodian banking app (ABA, ACLEDA, Wing, Bakong…). Money goes straight to your Bakong account.", "ភ្ញៀវស្កេន KHQR មួយ ដោយកម្មវិធីធនាគារណាក៏បាន (ABA, ACLEDA, Wing, Bakong…)។ ប្រាក់ចូលគណនី Bakong របស់អ្នកផ្ទាល់។")}>
            {(() => {
              const steps = [
                { ok: /^[a-z0-9._-]+@[a-z0-9]+$/i.test(pay.bakong_account_id ?? ""), label: L("Bakong account ID (name@bank) saved", "បានរក្សាទុកលេខគណនី Bakong (name@bank)") },
                { ok: Boolean(pay.merchant_name), label: L("Merchant name saved", "បានរក្សាទុកឈ្មោះអាជីវកម្ម") },
                { ok: Boolean(pay.api_token), label: L("Bakong API token saved (confirms payments automatically)", "បានរក្សាទុក API token (បញ្ជាក់ការបង់ប្រាក់ដោយស្វ័យប្រវត្តិ)") },
                { ok: Boolean(pay.enabled), label: L("KHQR payments turned on", "បានបើកការបង់ប្រាក់ KHQR") },
              ];
              const live = steps.every((x) => x.ok);
              return (
                <div className={`rounded-2xl p-4 ring-1 ${live ? "bg-light-green ring-primary/20" : "bg-amber-50 ring-amber-200"}`}>
                  <p className={`mb-2 flex items-center gap-2 text-sm font-extrabold ${live ? "text-primary" : "text-amber-800"}`}>
                    {live ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {live ? L("Online payment is live: visitors see a KHQR at checkout.", "ការបង់ប្រាក់អនឡាញដំណើរការ៖ ភ្ញៀវឃើញ KHQR ពេលទូទាត់។") : L("Online payment is OFF: visitors see \"Online payment isn't open yet\". Still needed:", "ការបង់ប្រាក់អនឡាញបិទ៖ ភ្ញៀវឃើញ «ការបង់ប្រាក់អនឡាញមិនទាន់បើក»។ នៅខ្វះ៖")}
                  </p>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {steps.map((x) => (
                      <li key={x.label} className={`flex items-center gap-2 ${x.ok ? "text-primary" : "font-semibold text-amber-900"}`}>
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black ${x.ok ? "bg-primary text-white" : "bg-white text-amber-700 ring-1 ring-amber-300"}`}>{x.ok ? "✓" : "!"}</span>
                        {x.label}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
              <input type="checkbox" name="enabled" defaultChecked={pay.enabled} className="h-5 w-5 accent-[#176B3A]" />
              {L("Turn on KHQR payments (needs the account ID and API token — tickets are confirmed only when Bakong reports the transfer)", "បើកការបង់ប្រាក់ KHQR (ត្រូវការលេខគណនី និង API token — សំបុត្របញ្ជាក់តែពេល Bakong រាយការណ៍ការផ្ទេរប្រាក់)")}
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={L("Bakong account ID", "លេខគណនី Bakong")}
                name="bakong_account_id"
                defaultValue={pay.bakong_account_id}
                placeholder="greenwildzoo@aclb"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                pattern="[A-Za-z0-9._\-]+@[A-Za-z0-9]+"
                title={L("name@bank, e.g. greenwildzoo@aclb (not an email address)", "name@bank ឧ. greenwildzoo@aclb (មិនមែនអ៊ីមែល)")}
                hint={L("Not your email. It's the ID that receives the money, like name@aclb or name@abaa: find it in your bank app or the Bakong app under your profile / Receive / KHQR.", "មិនមែនអ៊ីមែលទេ។ វាជាលេខដែលទទួលប្រាក់ ដូចជា name@aclb ឬ name@abaa៖ រកក្នុងកម្មវិធីធនាគារ ឬ Bakong ត្រង់ ប្រវត្តិរូប / ទទួលប្រាក់ / KHQR។")}
              />
              <Field
                label={L("Bank account number (optional)", "លេខគណនីធនាគារ (ជម្រើស)")}
                name="bank_account"
                defaultValue={pay.bank_account}
                placeholder={L("e.g. 000123456", "ឧ. 000123456")}
                inputMode="numeric"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                hint={L("The account the Bakong ID is linked to. It's added to the KHQR so the payer's bank shows where the money goes.", "គណនីដែលភ្ជាប់ជាមួយ Bakong ID។ វាត្រូវបានដាក់ក្នុង KHQR ដើម្បីឲ្យធនាគារអ្នកបង់ឃើញថាប្រាក់ទៅណា។")}
              />
              <div className="rounded-2xl bg-cream p-4 md:col-span-2">
                <p className="mb-3 text-sm font-bold text-forest">{L("Logo in the middle of the QR", "Logo នៅកណ្តាល QR")}</p>
                <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <SelectField label={L("Show", "បង្ហាញ")} name="qr_logo_mode" defaultValue={pay.qr_logo_mode ?? "site"}>
                    <option value="site">{L("The website logo (Green Wild Zoo)", "Logo របស់ website (Green Wild Zoo)")}</option>
                    <option value="khqr">{L("Standard KHQR mark (red circle with ៛ / $)", "សញ្ញា KHQR ស្តង់ដារ (រង្វង់ក្រហម ៛ / $)")}</option>
                    <option value="custom">{L("My own logo (upload below)", "Logo ផ្ទាល់ខ្លួន (បញ្ចូលខាងក្រោម)")}</option>
                  </SelectField>
                  <ImageUploadField
                    name="qr_logo"
                    label={L("Own logo (square PNG works best)", "Logo ផ្ទាល់ខ្លួន (PNG ការ៉េល្អបំផុត)")}
                    hint={L("Used when “My own logo” is chosen. Change it any time; new QR codes use it straight away.", "ប្រើពេលជ្រើស «Logo ផ្ទាល់ខ្លួន»។ ប្តូរបានគ្រប់ពេល QR ថ្មីប្រើវាភ្លាម។")}
                    current={pay.qr_logo_url}
                    uploadLabel={L("Upload logo", "បញ្ចូល logo")}
                    urlLabel={L("…or paste an image link", "…ឬបិទភ្ជាប់ link រូបភាព")}
                    aspect="aspect-square"
                    transparent
                  />
                </div>
              </div>
              <Field label={L("Bank name (optional)", "ឈ្មោះធនាគារ (ជម្រើស)")} name="bank_name" defaultValue={pay.bank_name} placeholder={L("e.g. ACLEDA Bank", "ឧ. ACLEDA Bank")} autoComplete="off" data-1p-ignore data-lpignore="true" />
              <Field label={L("Merchant name (on the QR)", "ឈ្មោះអាជីវកម្ម (លើ QR)")} name="merchant_name" defaultValue={pay.merchant_name ?? "Green Wild Zoo"} maxLength={25} />
              <Field label={L("City", "ទីក្រុង")} name="merchant_city" defaultValue={pay.merchant_city ?? "Phnom Penh"} maxLength={15} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label={L("Charge in", "គិតប្រាក់ជា")} name="currency" defaultValue={pay.currency ?? "USD"}>
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </SelectField>
                <Field label="1 USD = … KHR" name="usd_to_khr" type="number" defaultValue={pay.usd_to_khr ?? 4100} />
              </div>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-primary/15 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-forest">
                <KeyRound size={16} className="text-primary" /> {L("Automatic payment confirmation (Bakong Open API)", "បញ្ជាក់ការបង់ប្រាក់ដោយស្វ័យប្រវត្តិ (Bakong Open API)")}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={`API token ${pay.api_token ? `(${L("saved", "បានរក្សាទុក")} ${mask(pay.api_token)})` : ""}`}
                  name="api_token"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                  placeholder={pay.api_token ? L("Leave blank to keep · type - to remove", "ទុកទទេ = រក្សាទុក · វាយ - ដើម្បីលុប") : L("Paste your Bakong API token", "បិទភ្ជាប់ Bakong API token របស់អ្នក")}
                />
                <Field label="API URL" name="api_url" defaultValue={pay.api_url ?? "https://api-bakong.nbc.gov.kh"} />
              </div>
              <a href="https://api-bakong.nbc.gov.kh/register" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                {L("Get a free token at api-bakong.nbc.gov.kh/register", "យក token ឥតគិតថ្លៃនៅ api-bakong.nbc.gov.kh/register")} <ExternalLink size={12} />
              </a>
              <p className="mt-1 text-[11px] text-ink/45">{L("Tokens expire every 90 days — renew here when payments stop confirming.", "Token ផុតកំណត់រៀងរាល់ ៩០ ថ្ងៃ — ប្តូរថ្មីនៅទីនេះ ពេលការបង់ប្រាក់លែងបញ្ជាក់។")}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SubmitButton label={L("Save payment settings", "រក្សាទុកការកំណត់ការបង់ប្រាក់")} pendingLabel={L("Saving…", "កំពុងរក្សាទុក…")} />
            </div>
          </FormSection>
        </form>
        <form action={testPayment} className="-mt-3 flex justify-end">
          <button className="btn-outline bg-white px-4 py-2 text-xs">{L("Test KHQR & Bakong connection", "សាកល្បង KHQR និងការភ្ជាប់ Bakong")}</button>
        </form>
        {/* Bakong allows a limited number of checks a day: show how today is going */}
        <div className={`-mt-2 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${usage.limited ? "bg-red-50 ring-red-200" : "bg-white ring-black/5"}`}>
          <span className="font-bold text-forest">{L("Bakong checks today:", "ការពិនិត្យ Bakong ថ្ងៃនេះ៖")} {Math.min(usage.calls, 100)} / ~100</span>
          <span className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-black/5"><span className={`block h-full rounded-full ${usage.limited ? "bg-red-500" : "bg-primary"}`} style={{ width: `${Math.min(100, usage.calls)}%` }} /></span>
          {usage.limited && <span className="w-full text-xs font-bold text-red-700">{L("Limit reached: payments made now are confirmed automatically on the first check tomorrow. For busy days, ask NBC (api-bakong.nbc.gov.kh) for a higher daily limit.", "ដល់ដែនកំណត់៖ ការបង់ប្រាក់ពេលនេះនឹងបញ្ជាក់ដោយស្វ័យប្រវត្តិនៅការពិនិត្យដំបូងថ្ងៃស្អែក។ សម្រាប់ថ្ងៃមមាញឹក សូមស្នើ NBC (api-bakong.nbc.gov.kh) បង្កើនដែនកំណត់។")}</span>}
        </div>
        <PaymentTest />

        {/* ── Hiring (HR) ─────────────────────────────── */}
        <form action={saveHr} autoComplete="off" id="hr" className="scroll-mt-6">
          <FormSection icon={Briefcase} title={L("Hiring new staff (HR) & recruitment bot", "ជ្រើសរើសបុគ្គលិកថ្មី (HR) និង Bot ជ្រើសរើស")} hint={L("People apply at /careers with their CV. Turn on the two parts below: applications arrive in Staff → HR, and applicants follow everything in a Telegram bot (status, interview, result, questions — and their staff account once hired).", "អ្នកដាក់ពាក្យនៅ /careers ជាមួយ CV។ បើកផ្នែកទាំងពីរខាងក្រោម៖ ពាក្យសុំចូលទៅ បុគ្គលិក → HR ហើយបេក្ខជនតាមដានអ្វីៗក្នុង Telegram bot (ស្ថានភាព សម្ភាសន៍ លទ្ធផល សំណួរ — និងគណនីបុគ្គលិកពេលជាប់)។")}>
            <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
              <input type="checkbox" name="accept" defaultChecked={hr.accept} className="h-5 w-5 accent-[#176B3A]" /> {L("1 · Take applications (CVs go into Staff → HR)", "១ · ទទួលពាក្យសុំ (CV ចូល បុគ្គលិក → HR)")}
            </label>
            <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
              <input type="checkbox" name="telegram_on" defaultChecked={hr.telegram_on} className="h-5 w-5 accent-[#176B3A]" /> {L("2 · Link applicants to the Telegram bot", "២ · ភ្ជាប់បេក្ខជនទៅ Telegram bot")}
            </label>
            <ol className="list-decimal space-y-1 rounded-2xl bg-cream p-4 pl-8 text-sm text-ink/75">
              <li>{L("In Telegram open", "ក្នុង Telegram បើក")} <b>@BotFather</b> → <b>/newbot</b> {L("(e.g. name “GWZ Jobs”) → copy the token.", "(ឧ. ឈ្មោះ «GWZ Jobs») → ចម្លង token។")}</li>
              <li>{L("Paste it below, save, then press", "បិទភ្ជាប់ខាងក្រោម រក្សាទុក រួចចុច")} <b>{L("Connect the bot", "ភ្ជាប់ Bot")}</b>.</li>
            </ol>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={`${L("Recruitment bot token", "Token របស់ Bot ជ្រើសរើស")} ${hr.bot_token ? `(${L("saved", "បានរក្សាទុក")} ${mask(hr.bot_token)})` : ""}`} name="bot_token" autoComplete="off" spellCheck={false} data-1p-ignore data-lpignore="true" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} placeholder={hr.bot_token ? L("Leave blank to keep · type - to remove", "ទុកទទេ = រក្សាទុក · វាយ - ដើម្បីលុប") : "123456789:AAH…"} />
              <Field label={L("HR contact (shown in the bot)", "ទំនាក់ទំនង HR (បង្ហាញក្នុង Bot)")} name="contact" defaultValue={hr.contact} placeholder="HR office · 012 345 678 · Mon–Sat 8:00–17:00" />
            </div>
            <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
              <p className="font-bold">{hr.bot_username ? `${L("Connected", "បានភ្ជាប់")}: @${hr.bot_username}` : L("Bot not connected yet", "Bot មិនទាន់ភ្ជាប់")} · {L("this bot is only for hiring — separate from the staff notification bot above.", "Bot នេះសម្រាប់ជ្រើសរើសបុគ្គលិកតែប៉ុណ្ណោះ — ដាច់ដោយឡែកពី Bot ជូនដំណឹងបុគ្គលិកខាងលើ។")}</p>
              <p className="mt-1">
                {L("HR team chat:", "ក្រុម HR៖")} {hr.hr_chat_id ? <b>{L("linked ✓", "បានភ្ជាប់ ✓")}</b> : <b>{L("not linked", "មិនទាន់ភ្ជាប់")}</b>} — {L("new applications and applicants' questions go there (never to the staff group).", "ពាក្យសុំថ្មី និងសំណួរបេក្ខជនចូលទីនោះ (មិនចូលក្រុមបុគ្គលិកទេ)។")}
                {hr.link_code && !hr.hr_chat_id && (
                  <>
                    {" "}{L("To link it: add", "ដើម្បីភ្ជាប់៖ បន្ថែម")} @{hr.bot_username} {L("to your HR group and send", "ចូលក្រុម HR ហើយផ្ញើ")} <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">/link {hr.link_code}</code>
                  </>
                )}
              </p>
            </div>
            <div className="flex justify-end"><SubmitButton label={L("Save hiring settings", "រក្សាទុកការកំណត់ជ្រើសរើសបុគ្គលិក")} pendingLabel={L("Saving…", "កំពុងរក្សាទុក…")} /></div>
          </FormSection>
        </form>
        <form action={connectHrBot} className="-mt-3 flex justify-end">
          <button className="btn-outline bg-white px-4 py-2 text-xs" disabled={!hr.bot_token}>{L("Connect the bot", "ភ្ជាប់ Bot")}</button>
        </form>

        {/* ── Calls & live video ─────────────────────────────── */}
        <form action={saveTurn} autoComplete="off" id="turn" className="scroll-mt-6">
          <FormSection icon={PhoneCall} title={L("Calls (TURN server)", "ការហៅ (TURN server)")} hint={L("Calls go straight between phones. On some mobile networks (4G) two phones can't reach each other directly; a TURN server passes the call along so it always connects.", "ការហៅទៅដោយផ្ទាល់រវាងទូរស័ព្ទ។ លើបណ្តាញខ្លះ (4G) ទូរស័ព្ទពីរភ្ជាប់គ្នាដោយផ្ទាល់មិនបាន TURN server ជួយបញ្ជូនការហៅ ដើម្បីឲ្យភ្ជាប់ជានិច្ច។")}>
            <ol className="list-decimal space-y-1 rounded-2xl bg-cream p-4 pl-8 text-sm text-ink/75">
              <li>{L("Easiest: open", "ងាយបំផុត៖ បើក")} <a className="font-bold text-primary underline" href="https://dashboard.metered.ca/signup?tool=turnserver" target="_blank" rel="noreferrer">metered.ca</a> → {L("sign up free (20 GB a month)", "ចុះឈ្មោះឥតគិតថ្លៃ (20 GB ក្នុងមួយខែ)")} → <b>TURN Server</b> → {L("create an app.", "បង្កើត app។")}</li>
              <li>{L("Copy the app name (the part before", "ចម្លងឈ្មោះ app (ផ្នែកមុន")} <b>.metered.live</b>) {L("and the", "និង")} <b>API key</b>{L(", paste them below and save.", " បិទភ្ជាប់ខាងក្រោម ហើយរក្សាទុក។")}</li>
              <li>{L("Press", "ចុច")} <b>Test</b>{L(": it should say the TURN server answered.", "៖ វាគួរប្រាប់ថា TURN server បានឆ្លើយ។")}</li>
            </ol>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label={L("Provider", "អ្នកផ្តល់សេវា")} name="provider" defaultValue={turn.provider ?? "none"}>
                <option value="none">{L("None (direct only)", "គ្មាន (ភ្ជាប់ផ្ទាល់តែប៉ុណ្ណោះ)")}</option>
                <option value="metered">{L("Metered.ca (free 20 GB)", "Metered.ca (ឥតគិតថ្លៃ 20 GB)")}</option>
                <option value="cloudflare">Cloudflare Realtime TURN</option>
                <option value="custom">{L("My own TURN server", "TURN server ផ្ទាល់ខ្លួន")}</option>
              </SelectField>
              <Field label={L("Metered app name", "ឈ្មោះ app Metered")} name="metered_app" defaultValue={turn.metered_app} placeholder="greenwildzoo" />
              <Field label={`Metered API key ${turn.metered_key ? `(${L("saved", "បានរក្សាទុក")} ${mask(turn.metered_key)})` : ""}`} name="metered_key" autoComplete="off" data-1p-ignore data-lpignore="true" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} placeholder={turn.metered_key ? L("Leave blank to keep", "ទុកទទេ = រក្សាទុក") : ""} />
              <Field label="Cloudflare TURN key id" name="cf_key_id" defaultValue={turn.cf_key_id} />
              <Field label={`Cloudflare API token ${turn.cf_token ? `(${L("saved", "បានរក្សាទុក")} ${mask(turn.cf_token)})` : ""}`} name="cf_token" autoComplete="off" data-1p-ignore data-lpignore="true" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} placeholder={turn.cf_token ? L("Leave blank to keep", "ទុកទទេ = រក្សាទុក") : ""} />
              <Field label={L("Own TURN URLs (comma separated)", "URL TURN ផ្ទាល់ខ្លួន (បំបែកដោយក្បៀស)")} name="url" defaultValue={turn.url} placeholder="turn:turn.example.com:3478,turns:turn.example.com:443" />
              <Field label={L("Own TURN username", "ឈ្មោះអ្នកប្រើ TURN ផ្ទាល់ខ្លួន")} name="username" defaultValue={turn.username} autoComplete="off" />
              <Field label={`${L("Own TURN password", "ពាក្យសម្ងាត់ TURN ផ្ទាល់ខ្លួន")} ${turn.credential ? `(${L("saved", "បានរក្សាទុក")} ${mask(turn.credential)})` : ""}`} name="credential" autoComplete="off" data-1p-ignore data-lpignore="true" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} placeholder={turn.credential ? L("Leave blank to keep", "ទុកទទេ = រក្សាទុក") : ""} />
            </div>
            <div className="flex justify-end">
              <SubmitButton label={L("Save call settings", "រក្សាទុកការកំណត់ការហៅ")} pendingLabel={L("Saving…", "កំពុងរក្សាទុក…")} />
            </div>
          </FormSection>
        </form>
        <form action={testTurn} className="-mt-3 flex justify-end">
          <button className="btn-outline bg-white px-4 py-2 text-xs">{L("Test TURN server", "សាកល្បង TURN server")}</button>
        </form>

        {/* ── Text to speech ─────────────────────────────── */}
        <form action={saveTts}>
          <FormSection icon={AudioLines} title={L("Natural voices (Microsoft Azure Speech)", "សំឡេងធម្មជាតិ (Microsoft Azure Speech)")} hint={L("Used by the Listen page. Audio is generated once per animal and language, saved to Storage, then reused — so the free tier (500,000 characters / month) is plenty.", "ប្រើសម្រាប់អានសារ និងព័ត៌មានជាសំឡេង (ខ្មែរ និងអង់គ្លេស)។ កញ្ចប់ឥតគិតថ្លៃ (៥០០,០០០ តួអក្សរ/ខែ) គឺគ្រប់គ្រាន់។")}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={`Azure Speech key ${tts.azure_key ? `(${L("saved", "បានរក្សាទុក")} ${mask(tts.azure_key)})` : ""}`}
                name="azure_key"
                type="password"
                autoComplete="off"
                placeholder={tts.azure_key ? L("Leave blank to keep · type - to remove", "ទុកទទេ = រក្សាទុក · វាយ - ដើម្បីលុប") : L("Paste KEY 1 from your Speech resource", "បិទភ្ជាប់ KEY 1 ពី Speech resource របស់អ្នក")}
              />
              <Field label={L("Region", "តំបន់")} name="azure_region" defaultValue={tts.azure_region ?? "southeastasia"} placeholder="southeastasia" />
              <SelectField label={L("Khmer voice", "សំឡេងខ្មែរ")} name="voice_km" defaultValue={tts.voice_km ?? "km-KH-SreymomNeural"}>
                <option value="km-KH-SreymomNeural">ស្រីមុំ · Sreymom (female)</option>
                <option value="km-KH-PisethNeural">ពិសិដ្ឋ · Piseth (male)</option>
              </SelectField>
              <SelectField label={L("English voice", "សំឡេងអង់គ្លេស")} name="voice_en" defaultValue={tts.voice_en ?? "en-US-JennyNeural"}>
                <option value="en-US-JennyNeural">Jenny (US, female)</option>
                <option value="en-US-AriaNeural">Aria (US, female)</option>
                <option value="en-US-GuyNeural">Guy (US, male)</option>
                <option value="en-GB-SoniaNeural">Sonia (UK, female)</option>
              </SelectField>
              <SelectField label={L("Chinese voice", "សំឡេងចិន")} name="voice_zh" defaultValue={tts.voice_zh ?? "zh-CN-XiaoxiaoNeural"}>
                <option value="zh-CN-XiaoxiaoNeural">Xiaoxiao (female)</option>
                <option value="zh-CN-YunxiNeural">Yunxi (male)</option>
              </SelectField>
            </div>
            <a href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              {L("Create a free Speech resource on Azure", "បង្កើត Speech resource ឥតគិតថ្លៃលើ Azure")} <ExternalLink size={12} />
            </a>
            <div className="flex justify-end">
              <SubmitButton label={L("Save voice settings", "រក្សាទុកការកំណត់សំឡេង")} pendingLabel={L("Saving…", "កំពុងរក្សាទុក…")} />
            </div>
          </FormSection>
        </form>

        {/* ── Telegram ─────────────────────────────── */}
        <form action={saveTelegram} autoComplete="off" id="telegram" className="scroll-mt-6">
          <FormSection icon={Send} title={L("Telegram notifications", "ការជូនដំណឹង Telegram")} hint={L("Important news goes straight to your staff Telegram group: SOS, leave requests, problems, the daily cash close, paid bookings. The bot token stays on the server.", "ដំណឹងសំខាន់ៗចូលក្រុម Telegram បុគ្គលិកផ្ទាល់៖ SOS ការសុំច្បាប់ បញ្ហា ការបិទបញ្ជីប្រាក់ ការកក់ដែលបានបង់។ Bot token រក្សាទុកនៅលើ server។")}>
            {searchParams.tg && (
              <p className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${searchParams.tg === "fail" ? "bg-amber-50 text-amber-800" : "bg-light-green text-primary"}`}>
                {searchParams.tg === "fail" ? <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />}
                <span className="break-all">{searchParams.tg === "chats" ? `${L("Chats that wrote to the bot", "Chat ដែលបានសរសេរទៅ Bot")}: ${searchParams.detail}` : searchParams.detail}</span>
              </p>
            )}
            <ol className="list-decimal space-y-1 rounded-2xl bg-cream p-4 pl-8 text-sm text-ink/75">
              <li>{L("In Telegram, open", "ក្នុង Telegram បើក")} <b>@BotFather</b> → <b>/newbot</b> → {L("copy the token it gives you.", "ចម្លង token ដែលវាផ្តល់ឲ្យ។")}</li>
              <li>{L("Add the new bot to your staff group and send any message in the group.", "បន្ថែម Bot ថ្មីចូលក្រុមបុគ្គលិក ហើយផ្ញើសារណាមួយក្នុងក្រុម។")}</li>
              <li>{L("Paste the token below and save, then press", "បិទភ្ជាប់ token ខាងក្រោម រក្សាទុក រួចចុច")} <b>{L("Find my group", "រកក្រុមរបស់ខ្ញុំ")}</b> {L("to see the group's chat id.", "ដើម្បីឃើញ chat id របស់ក្រុម។")}</li>
              <li>{L("Paste the chat id, save, and press", "បិទភ្ជាប់ chat id រក្សាទុក ហើយចុច")} <b>{L("Send a test message", "ផ្ញើសារសាកល្បង")}</b>.</li>
            </ol>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={`Bot token ${tele.bot_token ? `(${L("saved", "បានរក្សាទុក")} ${mask(tele.bot_token)})` : ""}`}
                name="bot_token"
                type="text"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                placeholder={tele.bot_token ? L("Leave blank to keep · type - to remove", "ទុកទទេ = រក្សាទុក · វាយ - ដើម្បីលុប") : "123456789:AAH…"}
              />
              <Field label={L("Group chat id", "Chat id របស់ក្រុម")} name="chat_id" defaultValue={tele.chat_id} placeholder="-1001234567890" autoComplete="off" />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-forest">{L("Send these to the group", "ផ្ញើដំណឹងទាំងនេះទៅក្រុម")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TELEGRAM_EVENTS.map((e) => (
                  <label key={e} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink/75">
                    <input type="checkbox" name={`ev_${e}`} defaultChecked={!(tele.off ?? []).includes(e)} className="h-4 w-4 accent-[#176B3A]" /> {TG_EVENTS[e][km ? 1 : 0]}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <SubmitButton label={L("Save Telegram settings", "រក្សាទុកការកំណត់ Telegram")} pendingLabel={L("Saving…", "កំពុងរក្សាទុក…")} />
            </div>
          </FormSection>
        </form>
        <div className="-mt-3 flex flex-wrap justify-end gap-2">
          <form action={findTelegramChats}><button className="btn-outline bg-white px-4 py-2 text-xs">{L("Find my group", "រកក្រុមរបស់ខ្ញុំ")}</button></form>
          <form action={testTelegram}><button className="btn-outline bg-white px-4 py-2 text-xs" disabled={!tele.bot_token || !tele.chat_id}>{L("Send a test message", "ផ្ញើសារសាកល្បង")}</button></form>
        </div>
      </div>
    </div>
  );
}
