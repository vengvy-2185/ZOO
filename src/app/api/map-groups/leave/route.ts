import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const Schema = z.object({ groupId: z.string().uuid(), memberId: z.string().uuid() });

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { groupId, memberId } = parsed.data;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("map_group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) return NextResponse.json({ error: "Could not leave the group." }, { status: 500 });
  return NextResponse.json({ success: true });
}
