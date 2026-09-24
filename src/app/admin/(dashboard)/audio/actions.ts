"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { ensureNarration, TTS_LANGS, type TtsLang } from "@/lib/server/tts";
import { serviceClient } from "@/lib/server/private-settings";

// Generation uses the service role and a paid API, so re-check the role here.
async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
}

const done = (msg: string) => redirect(`/admin/audio?msg=${encodeURIComponent(msg)}`);

export async function generateVoice(code: string, lang: string) {
  await requireAdmin();
  if (!TTS_LANGS.includes(lang as TtsLang)) throw new Error("Bad language.");
  let msg: string;
  try {
    const r = await ensureNarration(code, lang as TtsLang, true);
    msg = "error" in r ? r.error : "ok";
  } catch (e) {
    msg = (e as Error).message;
  }
  revalidatePath("/admin/audio");
  done(msg);
}

export async function generateAllMissing() {
  await requireAdmin();
  const { data: animals } = await serviceClient().from("animals").select("animal_code").eq("status", "active");
  let made = 0;
  let msg = "ok";
  try {
    for (const a of animals ?? []) {
      for (const lang of TTS_LANGS) {
        const r = await ensureNarration(a.animal_code, lang);
        if ("url" in r) made++;
        else if (r.error === "not-configured") throw new Error("not-configured");
      }
    }
  } catch (e) {
    msg = (e as Error).message;
  }
  revalidatePath("/admin/audio");
  done(msg === "ok" ? `ok:${made}` : msg);
}
