import Link from "next/link";
import { Headphones, CheckCircle2, AlertTriangle, Wand2, Pencil, Plus, PlugZap, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, Thumb } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/ui-client";
import { getI18n } from "@/lib/i18n/server";
import { getTtsConfig } from "@/lib/server/tts";
import { generateVoice, generateAllMissing } from "./actions";

export const dynamic = "force-dynamic";

const LANGS = [
  { code: "km", flag: "🇰🇭", en: "Khmer", km: "ខ្មែរ" },
  { code: "en", flag: "🇬🇧", en: "English", km: "អង់គ្លេស" },
  { code: "zh", flag: "🇨🇳", en: "Chinese", km: "ចិន" },
] as const;

export default async function AdminAudioPage({ searchParams }: { searchParams: { msg?: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  const km = locale === "km";
  const [{ data: animals }, { data: guides }, { ready }] = await Promise.all([
    supabase.from("animals").select("id, animal_code, name, khmer_name, main_image_url, biography, biography_km").eq("status", "active").order("name"),
    supabase.from("audio_guides").select("id, animal_id, language, audio_url, transcript, voice_type, duration_seconds"),
    getTtsConfig(),
  ]);
  const a = t.admin.audioPage;
  const msg = searchParams.msg;
  const msgText =
    msg === "ok"
      ? km ? "បានបង្កើតសំឡេងរួចរាល់ ✓" : "Voice generated ✓"
      : msg?.startsWith("ok:")
        ? km ? `បានបង្កើតសំឡេង ${msg.slice(3)} ✓` : `${msg.slice(3)} recordings ready ✓`
        : msg === "no-text"
          ? km ? "គ្មានអត្ថបទសម្រាប់ភាសានេះទេ — សូមសរសេរអត្ថបទជាមុនសិន" : "No script for this language yet — write one first."
          : msg === "not-configured"
            ? km ? "សូមដាក់ Azure Speech key ជាមុនសិន" : "Add your Azure Speech key first."
            : msg;

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        icon={Headphones}
        title={a.title}
        subtitle={km ? "សំឡេងអានធម្មជាតិ (AI) ជាភាសាខ្មែរ អង់គ្លេស និងចិន — បង្កើតម្តង រក្សាទុក ហើយប្រើរហូត។" : "Natural AI narration in Khmer, English and Chinese — generated once, stored, reused."}
        actions={
          <>
            <Link href="/admin/manage/audio/new" className="btn-outline bg-white">
              <Plus size={16} /> {km ? "សរសេរអត្ថបទ" : "New script"}
            </Link>
            {ready && (
              <form action={generateAllMissing}>
                <SubmitButton label={km ? "បង្កើតសំឡេងដែលខ្វះ" : "Generate all missing"} pendingLabel={km ? "កំពុងបង្កើត…" : "Generating…"} className="px-5 py-2.5" />
              </form>
            )}
          </>
        }
      />
      {msg && (
        <p className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${msg.startsWith("ok") ? "bg-primary text-white" : "bg-amber-50 text-amber-800"}`}>
          {msg.startsWith("ok") ? <CheckCircle2 size={18} className="text-leaf" /> : <AlertTriangle size={18} />} {msgText}
        </p>
      )}
      {!ready && (
        <Link href="/admin/integrations" className="mb-5 flex items-center gap-3 rounded-3xl bg-cream p-4 text-sm ring-1 ring-primary/15 hover:ring-primary">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
            <PlugZap size={18} />
          </span>
          <span>
            <b className="text-forest">{km ? "ភ្ជាប់ Azure Speech ដើម្បីទទួលបានសំឡេងពិរោះ" : "Connect Azure Speech for beautiful voices"}</b>
            <span className="block text-ink/55">
              {km ? "ឥតគិតថ្លៃ ៥០០,០០០ តួអក្សរ/ខែ។ បើមិនទាន់ភ្ជាប់ ភ្ញៀវនឹងស្តាប់សំឡេងពីឧបករណ៍របស់ខ្លួន។" : "Free for 500,000 characters/month. Until then visitors hear their device's own voice."}
            </span>
          </span>
        </Link>
      )}

      <div className="grid gap-3">
        {((animals ?? []) as any[]).map((an) => (
          <div key={an.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-[200px] items-center gap-3">
              <Thumb src={an.main_image_url} className="h-12 w-12 rounded-full" />
              <div>
                <div className="font-display text-base font-bold text-forest">{(km && an.khmer_name) || an.name}</div>
                <Link href={`/animals/${an.animal_code}/audio`} target="_blank" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                  <Play size={10} /> {km ? "ស្តាប់ទំព័រភ្ញៀវ" : "Open listen page"}
                </Link>
              </div>
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-3">
              {LANGS.map((l) => {
                const g = ((guides ?? []) as any[]).find((x) => x.animal_id === an.id && x.language === l.code);
                const hasText = Boolean(g?.transcript || (l.code === "km" ? an.biography_km : l.code === "en" ? an.biography : null));
                return (
                  <div key={l.code} className="rounded-2xl bg-cream/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-forest">
                        {l.flag} {km ? l.km : l.en}
                      </span>
                      {g?.audio_url ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-light-green px-2 py-0.5 text-[10px] font-bold text-primary">
                          <CheckCircle2 size={11} /> {a.ready}
                          {g.duration_seconds ? ` · ${Math.floor(g.duration_seconds / 60)}:${String(g.duration_seconds % 60).padStart(2, "0")}` : ""}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{hasText ? (km ? "មិនទាន់មានសំឡេង" : "No audio") : km ? "គ្មានអត្ថបទ" : "No script"}</span>
                      )}
                    </div>
                    {g?.audio_url && <audio src={g.audio_url} controls preload="none" className="mt-2 h-8 w-full" />}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Link
                        href={g ? `/admin/manage/audio/${g.id}` : `/admin/manage/audio/new`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-ink/70 ring-1 ring-black/5 hover:text-primary"
                      >
                        <Pencil size={11} /> {km ? "អត្ថបទ" : "Script"}
                      </Link>
                      {ready && hasText && (
                        <form action={generateVoice.bind(null, an.animal_code, l.code)}>
                          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white hover:bg-forest">
                            <Wand2 size={11} /> {g?.audio_url ? (km ? "បង្កើតឡើងវិញ" : "Regenerate") : km ? "បង្កើតសំឡេង" : "Generate"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
