"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type ProfileResult = { ok: true; name: string; avatarUrl: string | null } | { ok: false; error: "login" | "name" | "image" | "save" };

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
// Letters (any language, incl. Khmer vowels/signs), digits, spaces and . ' -
const NAME_RE = /^[\p{L}\p{M}\p{N} .'-]{2,40}$/u;

/**
 * Saves the visitor's own display name and profile photo.
 * The name/photo go into `display_name` / `custom_avatar_url` so the next
 * Google sign-in (which rewrites full_name / avatar_url) doesn't undo them.
 */
export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "login" };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (!NAME_RE.test(name) || /https?:|www\./i.test(name)) return { ok: false, error: "name" };

  let avatarUrl = me.avatarUrl;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (!TYPES.includes(file.type) || file.size > MAX_BYTES) return { ok: false, error: "image" };
    // Service role for the upload, always into the visitor's own folder.
    const admin = createServiceRoleClient();
    const path = `${me.id}/avatar-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await admin.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
    if (error) return { ok: false, error: "save" };
    avatarUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  // The visitor's own session: updates their login profile (merged, not replaced)…
  const supabase = createClient();
  const { error: authError } = await supabase.auth.updateUser({ data: { display_name: name, custom_avatar_url: avatarUrl } });
  if (authError) return { ok: false, error: "save" };
  // …and their row in profiles (RLS: profiles_update_own).
  await supabase.from("profiles").update({ full_name: name, avatar_url: avatarUrl }).eq("id", me.id);

  revalidatePath("/account");
  return { ok: true, name, avatarUrl };
}
