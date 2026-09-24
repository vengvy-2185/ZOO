import "server-only";
import { createHash } from "crypto";
import { revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";
import { getPrivateSetting, serviceClient, type TtsSettings } from "./private-settings";

export type TtsLang = "km" | "en" | "zh";
export const TTS_LANGS: TtsLang[] = ["km", "en", "zh"];

const LOCALE: Record<TtsLang, string> = { km: "km-KH", en: "en-US", zh: "zh-CN" };
const DEFAULT_VOICE: Record<TtsLang, string> = { km: "km-KH-SreymomNeural", en: "en-US-JennyNeural", zh: "zh-CN-XiaoxiaoNeural" };
const MALE_VOICES = /Piseth|Guy|Yunxi|Davis|Ryan|Andrew/i;
const MAX_CHARS = 4000;

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function getTtsConfig() {
  const s = await getPrivateSetting<TtsSettings>("tts");
  return { settings: s, ready: Boolean(s.azure_key && s.azure_region) };
}

/** Calls Azure Neural TTS and returns MP3 bytes. */
export async function synthesize(s: TtsSettings, lang: TtsLang, text: string, voiceOverride?: string) {
  const voice = voiceOverride || s[`voice_${lang}` as const] || DEFAULT_VOICE[lang];
  // A touch slower for Khmer and Chinese so children can follow along.
  const rate = lang === "en" ? "0%" : "-6%";
  const ssml =
    `<speak version="1.0" xml:lang="${LOCALE[lang]}" xmlns="http://www.w3.org/2001/10/synthesis">` +
    `<voice name="${escapeXml(voice)}"><prosody rate="${rate}">${escapeXml(text.slice(0, MAX_CHARS))}</prosody></voice></speak>`;
  const res = await fetch(`https://${encodeURIComponent(s.azure_region!)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": s.azure_key!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "GreenWildZoo",
    },
    body: ssml,
    cache: "no-store",
  });
  if (!res.ok) {
    const hint = res.status === 401 ? "Azure key or region is wrong." : res.status === 429 ? "Azure free quota reached — try later." : `Azure error ${res.status}.`;
    throw new Error(hint);
  }
  return { audio: Buffer.from(await res.arrayBuffer()), voice };
}

/**
 * Makes sure the animal has a natural-voice recording for `lang`:
 * reuses the saved one unless `force`, otherwise generates, uploads to the
 * animal-audio bucket and stores the URL on the audio guide row.
 */
export async function ensureNarration(animalCode: string, lang: TtsLang, force = false): Promise<{ url: string } | { error: string }> {
  const { settings, ready } = await getTtsConfig();
  if (!ready) return { error: "not-configured" };
  const db = serviceClient();

  const { data: animal } = await db
    .from("animals")
    .select("id, animal_code, biography, biography_km, status")
    .eq("animal_code", animalCode)
    .maybeSingle();
  if (!animal || animal.status !== "active") return { error: "not-found" };

  const { data: guide } = await db
    .from("audio_guides")
    .select("id, transcript, audio_url")
    .eq("animal_id", animal.id)
    .eq("language", lang)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (guide?.audio_url && !force) return { url: guide.audio_url };

  const text = (guide?.transcript || (lang === "km" ? animal.biography_km : lang === "en" ? animal.biography : null) || "").trim();
  if (!text) return { error: "no-text" };

  const { audio, voice } = await synthesize(settings, lang, text);
  const hash = createHash("sha1").update(voice + text).digest("hex").slice(0, 10);
  const path = `tts/${animal.animal_code}-${lang}-${hash}.mp3`;
  const up = await db.storage.from("animal-audio").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
  const url = db.storage.from("animal-audio").getPublicUrl(path).data.publicUrl;

  const row = {
    audio_url: url,
    duration_seconds: Math.round((audio.length * 8) / 48000),
    voice_type: MALE_VOICES.test(voice) ? "male" : "female",
    is_active: true,
  };
  const { error } = guide
    ? await db.from("audio_guides").update(row).eq("id", guide.id)
    : await db.from("audio_guides").insert({ ...row, animal_id: animal.id, language: lang, transcript: text });
  if (error) throw new Error(error.message);

  revalidateTag(ZOO_TAG);
  return { url };
}
