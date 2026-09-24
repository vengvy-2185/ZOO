import { PlugZap, QrCode, AudioLines, CheckCircle2, AlertTriangle, ExternalLink, KeyRound } from "lucide-react";
import { AdminPageHeader, FormSection, Field, SelectField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
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
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Bakong account ID looks wrong — it should look like name@aba or name@acleda.</p>
      )}
      {searchParams.test && (
        <p className={`mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${searchParams.test === "ok" ? "bg-light-green text-primary" : "bg-amber-50 text-amber-800"}`}>
          {searchParams.test === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {searchParams.detail}
        </p>
      )}

      <div className="space-y-6">
        {/* ── Bakong KHQR ─────────────────────────────── */}
        <form action={savePayment}>
          <FormSection icon={QrCode} title="Bakong KHQR payments" hint="Visitors scan one KHQR with any Cambodian banking app (ABA, ACLEDA, Wing, Bakong…). Money goes straight to your Bakong account.">
            <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
              <input type="checkbox" name="enabled" defaultChecked={pay.enabled} className="h-5 w-5 accent-[#176B3A]" />
              Turn on KHQR payments (needs the account ID and API token — tickets are confirmed only when Bakong reports the transfer)
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Bakong account ID" name="bakong_account_id" defaultValue={pay.bakong_account_id} placeholder="greenwildzoo@aba" hint="The account that receives the money (shown in your bank app's KHQR / Bakong ID)." />
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
                  type="password"
                  autoComplete="off"
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
