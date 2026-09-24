import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024; // matches the animal-images bucket limit

/**
 * Resolves the image for a form field pair written by <ImageUploadField>:
 * if a file was chosen it is uploaded to Supabase Storage (through the
 * admin's own session, so the bucket's RLS policy authorises it) and its
 * public URL is returned; otherwise the pasted URL (or null) is returned.
 */
export async function resolveImage(formData: FormData, name: string, folder: string): Promise<string | null> {
  const file = formData.get(`${name}_file`);
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED.includes(file.type)) throw new Error("Please upload a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) throw new Error("Image is larger than 8 MB.");
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("animal-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from("animal-images").getPublicUrl(path).data.publicUrl;
  }
  const url = String(formData.get(name) ?? "").trim();
  return url || null;
}

/** "" → null for optional text columns. */
export function text(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

/**
 * Copies an image from an outside link into our own Storage bucket, so it
 * can't disappear later and the browser may draw it on a canvas (the photo
 * booth needs same-origin/CORS-safe images). Links already in our Storage
 * are returned unchanged.
 */
export async function mirrorImage(url: string | null, folder: string): Promise<string | null> {
  if (!url) return null;
  const own = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (own && url.startsWith(`${own}/storage/`)) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That image link isn't a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Image link must start with http(s)://");
  // Refuse obvious internal addresses.
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1)/i.test(parsed.hostname)) throw new Error("That image link is not allowed.");

  const res = await fetch(parsed, { signal: AbortSignal.timeout(15000), redirect: "follow", headers: { "User-Agent": "GreenWildZoo/1.0" } }).catch(() => null);
  if (!res?.ok) throw new Error("Couldn't download the image from that link.");
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.includes(type)) throw new Error("The link must point to a PNG, JPG or WebP image.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error("Image is larger than 8 MB.");

  const supabase = createClient();
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("animal-images").upload(path, bytes, { contentType: type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("animal-images").getPublicUrl(path).data.publicUrl;
}
