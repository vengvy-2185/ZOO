"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { REWARDS, redeemReward, type RewardKey } from "@/lib/server/points";

export type RedeemState = { ok: boolean; code?: string; reason?: string } | null;

export async function redeemAction(_prev: RedeemState, form: FormData): Promise<RedeemState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "signin" };
  const key = String(form.get("reward") ?? "") as RewardKey;
  if (!REWARDS.some((r) => r.key === key)) return { ok: false, reason: "unknown" };
  const res = await redeemReward(user.id, key);
  revalidatePath("/rewards");
  return res.ok ? { ok: true, code: res.code } : { ok: false, reason: res.reason };
}
