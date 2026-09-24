"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";
import { createClient } from "@/lib/supabase/server";
import { mirrorImage, resolveImage, text } from "@/lib/admin/upload";
import { getEntity } from "@/lib/admin/entities";
import { generateCode } from "@/lib/server/discounts";

const UUID = /^[0-9a-f-]{36}$/i;

// Runs as the admin's own session — each table's *_admin_write RLS policy
// is what actually authorises the write.
export async function saveEntity(entityKey: string, id: string, formData: FormData) {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error("Unknown item type.");
  const isNew = id === "new";
  if (isNew && entity.noCreate) throw new Error("Items of this type can't be created here.");
  if (!isNew && !UUID.test(id)) throw new Error("Bad id.");

  const row: Record<string, unknown> = {};
  for (const f of entity.fields) {
    switch (f.type) {
      case "bool":
        row[f.name] = formData.get(f.name) === "on";
        break;
      case "number": {
        const raw = String(formData.get(f.name) ?? "").trim();
        const n = raw === "" ? null : Number(raw);
        if (n !== null && !Number.isFinite(n)) throw new Error(`${f.label.en} must be a number.`);
        row[f.name] = n;
        break;
      }
      case "image":
        row[f.name] = await resolveImage(formData, f.name, f.folder ?? entityKey);
        if (f.mirror) row[f.name] = await mirrorImage(row[f.name] as string | null, f.folder ?? entityKey);
        break;
      case "date": {
        const d = text(formData, f.name);
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`${f.label.en} must be a date.`);
        row[f.name] = d;
        break;
      }
      case "code": {
        // Upper-case letters, digits and dashes only; empty → a fresh random code.
        const c = (text(formData, f.name) ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
        row[f.name] = c || generateCode();
        break;
      }
      default:
        row[f.name] = text(formData, f.name);
    }
    if (f.km) row[f.km] = text(formData, `${f.name}_km`);
    if (f.required && (row[f.name] === null || row[f.name] === "")) throw new Error(`${f.label.en} is required.`);
  }

  const supabase = createClient();

  // Editing an audio script invalidates the old recording (unless a new file URL was pasted).
  if (entity.table === "audio_guides" && !isNew) {
    const { data: old } = await supabase.from("audio_guides").select("transcript, audio_url").eq("id", id).maybeSingle();
    if (old && old.transcript !== row.transcript && old.audio_url === row.audio_url) row.audio_url = null;
  }

  const { error } = isNew
    ? await supabase.from(entity.table).insert(row)
    : await supabase.from(entity.table).update(row).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "This code already exists. Please choose another one." : error.message);

  revalidateTag(ZOO_TAG);
  revalidatePath("/", "layout");
  const parent = entity.parent ? row[entity.parent.column] : null;
  if (entity.listHref) redirect(`${entity.listHref}?saved=1`);
  redirect(`/admin/manage/${entityKey}?saved=1${parent ? `&parent=${parent}` : ""}`);
}

export async function deleteEntity(entityKey: string, id: string) {
  const entity = getEntity(entityKey);
  if (!entity || !UUID.test(id)) throw new Error("Unknown item.");
  const supabase = createClient();
  const { error } = await supabase.from(entity.table).delete().eq("id", id);
  if (error) {
    // Most likely a foreign key: something still points at this row.
    redirect(`/admin/manage/${entityKey}/${id}?error=in-use`);
  }
  revalidateTag(ZOO_TAG);
  revalidatePath("/", "layout");
  redirect(entity.listHref ? `${entity.listHref}?deleted=1` : `/admin/manage/${entityKey}?deleted=1`);
}
