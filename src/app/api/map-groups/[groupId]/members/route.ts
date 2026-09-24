import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("map_group_members")
    .select("id, display_name, avatar_color, avatar_emoji, map_x, map_y")
    .eq("group_id", params.groupId);

  if (error) return NextResponse.json({ error: "Could not load group." }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}
