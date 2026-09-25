import { NextResponse } from "next/server";
import { choosePayLater } from "@/lib/server/payments";

// The visitor picks "pay at the counter when I arrive" (or changes their mind).
// Needs the booking's secret key, like the pay page itself.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "");
  const key = String(body.key ?? "");
  if (!/^[A-Z0-9-]{4,40}$/i.test(code) || !/^[a-f0-9]{16,64}$/i.test(key)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const ok = await choosePayLater(code, key, body.later !== false);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
