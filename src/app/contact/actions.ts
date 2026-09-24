"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ContactState = { ok: boolean; error?: "invalid" | "busy" | "error" } | null;

const Form = z.object({
  name: z.string().trim().min(1).max(60),
  contact: z.string().trim().min(3).max(80),
  topic: z.enum(["visit", "tickets", "animals", "lost", "feedback", "other"]).catch("other"),
  message: z.string().trim().min(5).max(1000),
  website: z.string().max(0).optional(), // hidden field: bots fill it in, people don't
});

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const parsed = Form.safeParse({
    name: form.get("name"),
    contact: form.get("contact"),
    topic: form.get("topic"),
    message: form.get("message"),
    website: form.get("website") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { website: _trap, ...row } = parsed.data;

  const db = createServiceRoleClient();
  // At most 3 messages from the same phone/email in 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("contact", row.contact).gte("created_at", since);
  if ((count ?? 0) >= 3) return { ok: false, error: "busy" };

  const { error } = await db.from("contact_messages").insert(row);
  return error ? { ok: false, error: "error" } : { ok: true };
}
