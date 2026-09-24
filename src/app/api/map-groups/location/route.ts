import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const Schema = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
  mapX: z.number().min(0).max(100),
  mapY: z.number().min(0).max(100),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { groupId, memberId, mapX, mapY } = parsed.data;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("map_group_members")
    .update({ map_x: mapX, map_y: mapY, is_sharing: true, last_seen_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) return NextResponse.json({ error: "Could not update your location." }, { status: 500 });
  return NextResponse.json({ success: true });
}
