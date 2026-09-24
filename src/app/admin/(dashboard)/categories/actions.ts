"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";
import { createClient } from "@/lib/supabase/server";
import { resolveImage, text } from "@/lib/admin/upload";

// Runs as the admin's own session — RLS (categories_admin_write) authorises it.
export async function updateCategory(id: string, formData: FormData) {
  const supabase = createClient();
  const name = text(formData, "name");
  if (!name) throw new Error("Name is required.");

  const { error } = await supabase
    .from("animal_categories")
    .update({
      name,
      khmer_name: text(formData, "khmer_name"),
      icon: text(formData, "icon"),
      description: text(formData, "description"),
      description_km: text(formData, "description_km"),
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      is_active: formData.get("is_active") === "on",
      image_url: await resolveImage(formData, "image_url", "categories"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateTag(ZOO_TAG);
  revalidatePath("/admin/categories");
  revalidatePath("/animals");
  revalidatePath("/");
  redirect("/admin/categories?saved=1");
}
