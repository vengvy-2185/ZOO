import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { pickAvatar } from "@/lib/utils/mapGroup";

const Schema = z.object({
  joinCode: z.string().min(4).max(10),
  displayName: z.string().min(1).max(30),
  deviceToken: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { joinCode, displayName, deviceToken } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: group, error: groupError } = await supabase
    .from("map_groups")
    .select("id, join_code, expires_at")
    .eq("join_code", joinCode.toUpperCase().trim())
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: "That group code wasn't found." }, { status: 404 });
  }
  if (new Date(group.expires_at) < new Date()) {
    return NextResponse.json({ error: "This group has expired." }, { status: 410 });
  }

  const { count } = await supabase
    .from("map_group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  const avatar = pickAvatar(count ?? 0);

  const { data: member, error: memberError } = await supabase
    .from("map_group_members")
    .upsert(
      {
        group_id: group.id,
        device_token: deviceToken,
        display_name: displayName,
        avatar_color: avatar.color,
        avatar_emoji: avatar.emoji,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "group_id,device_token" }
    )
    .select()
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Could not join this group." }, { status: 500 });
  }

  return NextResponse.json({ groupId: group.id, joinCode: group.join_code, memberId: member.id });
}
