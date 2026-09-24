import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { checkInTicket } from "@/lib/server/checkin";

export type { ScanVerdict } from "@/lib/server/checkin";

// Staff-only, one step: look the ticket up AND check it in, so the gate
// staff just scan and read the big coloured answer.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { role } = await getCachedRole(user.id);
  if (role !== "staff" && role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const out = await checkInTicket(String(body.token ?? ""), user.id, body.force === true);
  if (out.error) return NextResponse.json({ error: out.error }, { status: 500 });
  return NextResponse.json(out);
}
