import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateJoinCode, pickAvatar } from "@/lib/utils/mapGroup";

const Schema = z.object({
  displayName: z.string().min(1).max(30),
  deviceToken: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { displayName, deviceToken } = parsed.data;

  const supabase = createServiceRoleClient();

  // Retry a couple of times in the astronomically unlikely event of a
  // join_code collision (unique constraint on map_groups.join_code).
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    const { data: group, error: groupError } = await supabase
      .from("map_groups")
      .insert({ join_code: joinCode })
      .select()
      .single();

    if (groupError) {
      if (groupError.code === "23505") continue; // unique_violation — retry
      return NextResponse.json({ error: "Could not create group." }, { status: 500 });
    }

    const avatar = pickAvatar(0);
    const { data: member, error: memberError } = await supabase
      .from("map_group_members")
      .insert({
        group_id: group.id,
        device_token: deviceToken,
        display_name: displayName,
        avatar_color: avatar.color,
        avatar_emoji: avatar.emoji,
      })
      .select()
      .single();

    if (memberError) return NextResponse.json({ error: "Could not join your own group." }, { status: 500 });

    return NextResponse.json({ groupId: group.id, joinCode: group.join_code, memberId: member.id });
  }

  return NextResponse.json({ error: "Could not generate a unique join code, please try again." }, { status: 500 });
}
