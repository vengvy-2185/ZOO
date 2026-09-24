"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";
import { createClient } from "@/lib/supabase/server";
import { resolveImage, text } from "@/lib/admin/upload";

// All writes run as the signed-in admin's own session, so Postgres RLS
// (animals_admin_write etc. in 0003_rls.sql) is what actually authorises
// them — not this code.

const BILINGUAL = ["biography", "personality", "favorite_food", "favorite_activities", "interesting_facts", "care_information", "place_of_birth"];

function animalFields(formData: FormData) {
  const row: Record<string, unknown> = {
    name: text(formData, "name"),
    khmer_name: text(formData, "khmer_name"),
    animal_code: text(formData, "animal_code")?.toUpperCase(),
    species_id: text(formData, "species_id"),
    category_id: text(formData, "category_id"),
    gender: text(formData, "gender") ?? "unknown",
    status: text(formData, "status") ?? "active",
    date_of_birth: text(formData, "date_of_birth"),
    arrival_date: text(formData, "arrival_date"),
  };
  for (const f of BILINGUAL) {
    row[f] = text(formData, f);
    row[`${f}_km`] = text(formData, `${f}_km`);
  }
  if (!row.name || !row.animal_code || !row.species_id || !row.category_id) {
    throw new Error("Name, animal code, category and species are required.");
  }
  return row;
}

function revalidateAnimal(code?: string) {
  revalidateTag(ZOO_TAG);
  revalidatePath("/admin/animals");
  revalidatePath("/animals");
  revalidatePath("/");
  if (code) revalidatePath(`/animals/${code}`);
}

export async function createAnimal(formData: FormData) {
  const supabase = createClient();
  const row = animalFields(formData);
  row.main_image_url = await resolveImage(formData, "main_image_url", "animals");

  const { data, error } = await supabase.from("animals").insert(row).select("id, animal_code").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save animal.");

  revalidateAnimal(data.animal_code);
  redirect(`/admin/animals/${data.id}?saved=1`);
}

export async function updateAnimal(id: string, formData: FormData) {
  const supabase = createClient();
  const row = animalFields(formData);
  row.main_image_url = await resolveImage(formData, "main_image_url", "animals");

  const { data, error } = await supabase.from("animals").update(row).eq("id", id).select("animal_code").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save animal.");

  revalidateAnimal(data.animal_code);
  redirect(`/admin/animals/${id}?saved=1`);
}

export async function addAnimalPhoto(animalId: string, formData: FormData) {
  const supabase = createClient();
  const url = await resolveImage(formData, "photo", `animals/${animalId}`);
  if (!url) throw new Error("Choose a photo to upload.");

  const { count } = await supabase.from("animal_photos").select("*", { count: "exact", head: true }).eq("animal_id", animalId);
  const { error } = await supabase.from("animal_photos").insert({
    animal_id: animalId,
    image_url: url,
    caption: text(formData, "caption"),
    caption_km: text(formData, "caption_km"),
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidateTag(ZOO_TAG);
  revalidatePath(`/admin/animals/${animalId}`);
  revalidateAnimal();
}

export async function deleteAnimalPhoto(animalId: string, photoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("animal_photos").delete().eq("id", photoId).eq("animal_id", animalId);
  if (error) throw new Error(error.message);
  revalidateTag(ZOO_TAG);
  revalidatePath(`/admin/animals/${animalId}`);
  revalidateAnimal();
}
