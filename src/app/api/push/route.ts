import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { pushKeys, sendPush } from "@/lib/server/push";
import { serviceClient } from "@/lib/server/private-settings";
import { allow, tooMany } from "@/lib/server/rate-limit";

// GET: the public key phones need to subscribe.
// POST { subscription }: this phone wants notifications for the signed-in person.
// DELETE { endpoint }: stop notifications on this phone.
// PUT: send a test notification to my own phones.

export async function GET() {
  return NextResponse.json({ key: (await pushKeys()).publicKey });
}

const Sub = z.object({ subscription: z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await allow("push-sub", 20, 60, user.id))) return tooMany();
  const parsed = Sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const s = parsed.data.subscription;
  await serviceClient()
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200) }, { onConflict: "endpoint" });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await serviceClient().from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", String(body.endpoint ?? ""));
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await allow("push-test", 5, 60, user.id))) return tooMany();
  const sent = await sendPush([user.id], { title: "Green Wild Zoo", body: "✅ ការជូនដំណឹងដំណើរការហើយ", url: "/staff", tag: "test" });
  return NextResponse.json({ sent });
}
