import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { getPrivateSetting, type PaymentSettings } from "@/lib/server/private-settings";
import { checkTransaction, createKhqrIn } from "@/lib/server/bakong";

// Admin-only "send 100៛ to yourself" test: makes a real KHQR with the saved
// settings, then (polled by the page) asks Bakong from THIS server whether it
// was paid, so it also proves the live server can reach the Bakong API.
// Nothing is stored and no booking is touched.
export const dynamic = "force-dynamic";

async function admin() {
  const me = await getSessionUser();
  return Boolean(me && (await getCachedRole(me.id)).role === "admin");
}

export async function POST() {
  if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const s = await getPrivateSetting<PaymentSettings>("payment");
  if (!s.bakong_account_id) return NextResponse.json({ error: "Save a Bakong account ID first." }, { status: 400 });
  try {
    const k = createKhqrIn(s, "KHR", 100, `TEST-${Date.now().toString(36).toUpperCase()}`);
    return NextResponse.json({ qr: k.qr, md5: k.md5, amount: k.amount, currency: k.currency, expiresAt: k.expiresAt.toISOString(), account: s.bakong_account_id, hasToken: Boolean(s.api_token) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create the KHQR." }, { status: 400 });
  }
}

export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const md5 = new URL(req.url).searchParams.get("md5") ?? "";
  if (!/^[a-f0-9]{32}$/i.test(md5)) return NextResponse.json({ error: "bad md5" }, { status: 400 });
  const s = await getPrivateSetting<PaymentSettings>("payment");
  return NextResponse.json(await checkTransaction(s, md5));
}
