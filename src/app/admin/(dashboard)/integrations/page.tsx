import { PlugZap, QrCode, AudioLines, CheckCircle2, AlertTriangle, ExternalLink, KeyRound } from "lucide-react";
import { AdminPageHeader, FormSection, Field, SelectField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
import { PaymentTest } from "@/components/admin/PaymentTest";
import { getPrivateSetting, mask, type PaymentSettings, type TtsSettings } from "@/lib/server/private-settings";
import { savePayment, saveTts, testPayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams }: { searchParams: { msg?: string; test?: string; detail?: string } }) {
  const [pay, tts] = await Promise.all([getPrivateSetting<PaymentSettings>("payment"), getPrivateSetting<TtsSettings>("tts")]);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <AdminPageHeader icon={PlugZap} title="Payments & Voice" subtitle="Bakong KHQR for tickets and adoptions · natural text-to-speech voices (Khmer, English, Chinese)." />

      {searchParams.msg === "saved" && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white">
          <CheckCircle2 size={18} className="text-leaf" /> Saved ✓
        </p>
      )}
      {searchParams.msg === "bad-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Not saved: the Bakong account ID looks wrong. It should look like name@aclb or name@abaa (letters/numbers, one @, no dot after it).</p>
      )}
      {searchParams.msg === "email-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Not saved: that is an email address, not a Bakong account ID. Open your bank app (ABA, ACLEDA, Wing…) or the Bakong app → your profile / "Receive" / KHQR, and copy the ID that looks like name@bank (e.g. greenwildzoo@aclb).
        </p>
      )}
      {searchParams.msg === "bad-bank-account" && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Not saved: the bank account number should be digits only (6–24 digits).</p>
      )}
      {searchParams.test && (
        <p className={`mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${searchParams.test === "ok" ? "bg-light-green text-primary" : "bg-amber-50 text-amber-800"}`}>
          {searchParams.test === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {searchParams.detail}
        </p>
      )}

      <div className="space-y-6">
        {/* ── Bakong KHQR ─────────────────────────────── */}
        <form action={savePayment} autoComplete="off">
          <FormSection icon={QrCode} title="Bakong KHQR payments" hint="Visitors scan one KHQR with any Cambodian banking app (ABA, ACLEDA, Wing, Bakong…). Money goes straight to your Bakong account.">
            {(() => {
              const steps = [
                { ok: /^[a-z0-9._-]+@[a-z0-9]+$/i.test(pay.bakong_account_id ?? ""), label: "Bakong account ID (name@bank) saved" },
                { ok: Boolean(pay.merchant_name), label: "Merchant name saved" },
                { ok: Boolean(pay.api_token), label: "Bakong API token saved (confirms payments automatically)" },
                { ok: Boolean(pay.enabled), label: "KHQR payments turned on" },
              ];
              const live = steps.every((x) => x.ok);
              return (
                <div className={`rounded-2xl p-4 ring-1 ${live ? "bg-light-green ring-primary/20" : "bg-amber-50 ring-amber-200"}`}>
                  <p className={`mb-2 flex items-center gap-2 text-sm font-extrabold ${live ? "text-primary" : "text-amber-800"}`}>
                    {live ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {live ? "Online payment is live: visitors see a KHQR at checkout." : "Online payment is OFF: visitors see \"Online payment isn't open yet\". Still needed:"}
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
              Turn on KHQR payments (needs the account ID and API token — tickets are confirmed only when Bakong reports the transfer)
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Bakong account ID"
                name="bakong_account_id"
                defaultValue={pay.bakong_account_id}
                placeholder="greenwildzoo@aclb"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                pattern="[A-Za-z0-9._\-]+@[A-Za-z0-9]+"
                title="name@bank, e.g. greenwildzoo@aclb (not an email address)"
                hint="Not your email. It's the ID that receives the money, like name@aclb or name@abaa: find it in your bank app or the Bakong app under your profile / Receive / KHQR."
              />
              <Field
                label="Bank account number (optional)"
                name="bank_account"
                defaultValue={pay.bank_account}
                placeholder="e.g. 000123456"
                inputMode="numeric"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                hint="The account the Bakong ID is linked to. It's added to the KHQR so the payer's bank shows where the money goes."
              />
              <Field label="Bank name (optional)" name="bank_name" defaultValue={pay.bank_name} placeholder="e.g. ACLEDA Bank" autoComplete="off" data-1p-ignore data-lpignore="true" />
              <Field label="Merchant name (on the QR)" name="merchant_name" defaultValue={pay.merchant_name ?? "Green Wild Zoo"} maxLength={25} />
              <Field label="City" name="merchant_city" defaultValue={pay.merchant_city ?? "Phnom Penh"} maxLength={15} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Charge in" name="currency" defaultValue={pay.currency ?? "USD"}>
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </SelectField>
                <Field label="1 USD = … KHR" name="usd_to_khr" type="number" defaultValue={pay.usd_to_khr ?? 4100} />
              </div>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-primary/15 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-forest">
                <KeyRound size={16} className="text-primary" /> Automatic payment confirmation (Bakong Open API)
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={`API token ${pay.api_token ? `(saved ${mask(pay.api_token)})` : ""}`}
                  name="api_token"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                  placeholder={pay.api_token ? "Leave blank to keep · type - to remove" : "Paste your Bakong API token"}
                />
                <Field label="API URL" name="api_url" defaultValue={pay.api_url ?? "https://api-bakong.nbc.gov.kh"} />
              </div>
              <a href="https://api-bakong.nbc.gov.kh/register" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                Get a free token at api-bakong.nbc.gov.kh/register <ExternalLink size={12} />
              </a>
              <p className="mt-1 text-[11px] text-ink/45">Tokens expire every 90 days — renew here when payments stop confirming.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SubmitButton label="Save payment settings" pendingLabel="Saving…" />
            </div>
          </FormSection>
        </form>
        <form action={testPayment} className="-mt-3 flex justify-end">
          <button className="btn-outline bg-white px-4 py-2 text-xs">Test KHQR & Bakong connection</button>
        </form>
        <PaymentTest />

        {/* ── Text to speech ─────────────────────────────── */}
        <form action={saveTts}>
          <FormSection icon={AudioLines} title="Natural voices (Microsoft Azure Speech)" hint="Used by the Listen page. Audio is generated once per animal and language, saved to Storage, then reused — so the free tier (500,000 characters / month) is plenty.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={`Azure Speech key ${tts.azure_key ? `(saved ${mask(tts.azure_key)})` : ""}`}
                name="azure_key"
                type="password"
                autoComplete="off"
                placeholder={tts.azure_key ? "Leave blank to keep · type - to remove" : "Paste KEY 1 from your Speech resource"}
              />
              <Field label="Region" name="azure_region" defaultValue={tts.azure_region ?? "southeastasia"} placeholder="southeastasia" />
              <SelectField label="Khmer voice" name="voice_km" defaultValue={tts.voice_km ?? "km-KH-SreymomNeural"}>
                <option value="km-KH-SreymomNeural">ស្រីមុំ · Sreymom (female)</option>
                <option value="km-KH-PisethNeural">ពិសិដ្ឋ · Piseth (male)</option>
              </SelectField>
              <SelectField label="English voice" name="voice_en" defaultValue={tts.voice_en ?? "en-US-JennyNeural"}>
                <option value="en-US-JennyNeural">Jenny (US, female)</option>
                <option value="en-US-AriaNeural">Aria (US, female)</option>
                <option value="en-US-GuyNeural">Guy (US, male)</option>
                <option value="en-GB-SoniaNeural">Sonia (UK, female)</option>
              </SelectField>
              <SelectField label="Chinese voice" name="voice_zh" defaultValue={tts.voice_zh ?? "zh-CN-XiaoxiaoNeural"}>
                <option value="zh-CN-XiaoxiaoNeural">Xiaoxiao (female)</option>
                <option value="zh-CN-YunxiNeural">Yunxi (male)</option>
              </SelectField>
            </div>
            <a href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Create a free Speech resource on Azure <ExternalLink size={12} />
            </a>
            <div className="flex justify-end">
              <SubmitButton label="Save voice settings" pendingLabel="Saving…" />
            </div>
          </FormSection>
        </form>
      </div>
    </div>
  );
}
