"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { ZOO_TAG } from "@/lib/data/zoo";

const Input = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3).max(500) });

/** Creates or updates the signed-in visitor's review (one per person). */
export async function saveReview(rating: number, comment: string): Promise<{ ok: true } | { error: string }> {
  const me = await getSessionUser();
  if (!me) return { error: "login" };
  const parsed = Input.safeParse({ rating, comment });
  if (!parsed.success) return { error: "invalid" };
  const name = (me.fullName || me.email?.split("@")[0] || "Visitor").slice(0, 60);
  // The visitor's own session: RLS only lets them write their own row.
  const { error } = await createClient()
    .from("reviews")
    .upsert(
      { user_id: me.id, name, avatar_url: me.avatarUrl ?? null, rating: parsed.data.rating, comment: parsed.data.comment, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return { error: "save" };
  revalidateTag(ZOO_TAG);
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMyReview(): Promise<{ ok: true } | { error: string }> {
  const me = await getSessionUser();
  if (!me) return { error: "login" };
  const { error } = await createClient().from("reviews").delete().eq("user_id", me.id);
  if (error) return { error: "save" };
  revalidateTag(ZOO_TAG);
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}
