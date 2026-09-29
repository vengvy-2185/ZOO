import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkInTicket } from "@/lib/server/checkin";
import { isGateCategory } from "@/lib/data/gate";
import { allow, tooMany } from "@/lib/server/rate-limit";
import { notify, tg } from "@/lib/server/telegram";

// Work done on a device without internet arrives here when the connection is
// back. Every piece is checked again as if it were done now (who is signed
// in, what their position allows), and each id is handled only once.

const Op = z.object({
  id: z.string().uuid(),
  kind: z.enum(["gate", "checkin", "chat"]),
  at: z.string().datetime(),
  payload: z.record(z.unknown()),
});
const Body = z.object({ ops: z.array(Op).max(50) });

type Result = { id: string; status: "done" | "retry" | "rejected"; title?: string; detail?: string; problem?: boolean };
const CHANNELS = ["all", "managers", "tickets", "animals", "guide", "cleaning"];
const zooDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await allow("sync", 60, 60, user.id))) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const access = await staffAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = createServiceRoleClient();
  const ids = parsed.data.ops.map((o) => o.id);
  const { data: seen } = await db.from("offline_ops").select("id, user_id, result").in("id", ids);
  const seenMap = new Map((seen ?? []).map((s: any) => [s.id, s]));
  const now = Date.now();
  const results: Result[] = [];
  const summary = { gate: 0, checkin: 0, chat: 0, problems: 0, late: 0 };

  for (const op of parsed.data.ops) {
    const before = seenMap.get(op.id);
    if (before) {
      // already handled (the answer got lost on the way back): same answer again
      results.push(before.user_id === user.id ? { ...(before.result as Result), id: op.id } : { id: op.id, status: "rejected", title: "Not yours" });
      continue;
    }
    const at = Date.parse(op.at);
    // work "from the future" or older than 3 days is not accepted
    if (at > now + 5 * 60e3 || at < now - 3 * 864e5) {
      results.push(await remember(op, { id: op.id, status: "rejected", title: "Too old to send", detail: op.at, problem: true }));
      continue;
    }
    if (now - at > 2 * 60e3) summary.late++;
    let r: Result;
    try {
      r = await handle(op, user.id, access);
    } catch (e) {
      // a passing problem (database busy…): keep it on the device and try again
      results.push({ id: op.id, status: "retry", detail: e instanceof Error ? e.message : "error" });
      continue;
    }
    if (r.status === "done") summary[op.kind]++;
    if (r.problem || r.status === "rejected") summary.problems++;
    results.push(await remember(op, r));
  }

  if (summary.gate) {
    revalidatePath("/admin/visitors");
    revalidatePath("/staff/gate");
    revalidatePath("/staff/cash");
  }
  if (summary.checkin) revalidatePath("/staff/bookings");
  if (summary.chat) revalidatePath("/staff/chat");
  if (summary.late) {
    const name = access.staff ? `${access.staff.full_name_km || access.staff.full_name} (${access.staff.staff_no})` : "Admin";
    const parts = [summary.gate && `រាប់ភ្ញៀវ ${summary.gate}`, summary.checkin && `ស្កេនសំបុត្រ ${summary.checkin}`, summary.chat && `សារ ${summary.chat}`].filter(Boolean).join(" · ");
    await notify("sync", `📶 <b>ការងារពេលគ្មាន internet ត្រូវបាន sync</b>\n👤 ${tg(name)}\n${parts || "—"}${summary.problems ? `\n⚠️ មានបញ្ហា ${summary.problems}` : ""}`);
  }
  return NextResponse.json({ results });

  async function remember(op: z.infer<typeof Op>, r: Result) {
    if (r.status !== "retry") await db.from("offline_ops").upsert({ id: op.id, user_id: user!.id, kind: op.kind, result: r }, { onConflict: "id", ignoreDuplicates: true });
    return r;
  }
}

async function handle(op: z.infer<typeof Op>, userId: string, access: Awaited<ReturnType<typeof staffAccess>>): Promise<Result> {
  const db = createServiceRoleClient();
  const p = op.payload;

  if (op.kind === "gate") {
    if (!access.perms.has("tickets")) return { id: op.id, status: "rejected", title: "Gate count refused", detail: "Your position can't count at the gate.", problem: true };
    const category = String(p.category ?? "");
    const delta = Number(p.delta);
    if (!isGateCategory(category) || !Number.isInteger(delta) || delta === 0 || delta < -50 || delta > 500) return { id: op.id, status: "rejected", title: "Gate count refused", detail: "Invalid count.", problem: true };
    // the op id is the row id: sending it twice can never count twice
    const { error } = await db.from("gate_entries").insert({ id: op.id, category, count: delta, created_by: userId, source: "gate", entry_date: zooDay(op.at), created_at: op.at });
    if (error && error.code !== "23505") {
      if (error.code === "23514") return { id: op.id, status: "rejected", title: "Gate count refused", detail: error.message, problem: true };
      throw new Error(error.message);
    }
    return { id: op.id, status: "done" };
  }

  if (op.kind === "checkin") {
    if (!access.perms.has("tickets")) return { id: op.id, status: "rejected", title: "Ticket refused", detail: "Your position can't scan tickets.", problem: true };
    const out = await checkInTicket(String(p.token ?? ""), userId, p.force === true, op.at);
    if (out.error) throw new Error(out.error);
    const code = out.ticket?.code ?? "";
    const people = out.ticket?.visitors ?? 0;
    if (out.verdict === "ok") return { id: op.id, status: "done" };
    const WHY: Record<string, string> = {
      already: "Already used before",
      unpaid: "Not paid",
      cancelled: "Booking cancelled",
      wrong_date: "Ticket for another day",
      invalid: "Not a valid ticket",
    };
    // the visitor is already inside: tell the staff member so they can follow up
    return { id: op.id, status: "done", problem: true, title: `${code || "Ticket"} · ${WHY[out.verdict] ?? out.verdict}`, detail: `${people ? `${people} visitors · ` : ""}${out.verdict === "already" && out.checkedInAt ? `first scan ${out.checkedInAt}` : "let in while offline"}` };
  }

  // chat (text only)
  const channel = String(p.channel ?? "all");
  const body = String(p.body ?? "").trim().slice(0, 1000);
  const allowed = access.admin || channel === "all" || (channel === "managers" ? access.perms.has("reports") : CHANNELS.includes(channel) && access.perms.has(channel as any));
  if (!body || !CHANNELS.includes(channel) || !allowed) return { id: op.id, status: "rejected", title: "Message not sent", detail: body.slice(0, 60), problem: true };
  const { error } = await db.from("staff_messages").insert({ channel, body, user_id: userId });
  if (error) throw new Error(error.message);
  const { sendPush, staffIds, managerIds } = await import("@/lib/server/push");
  const ids = channel === "all" ? [...(await staffIds()), ...(await managerIds())] : channel === "managers" ? await managerIds() : [...(await staffIds(channel)), ...(await managerIds())];
  const name = access.staff ? access.staff.full_name_km || access.staff.full_name : "Admin";
  await sendPush(ids.filter((u) => u !== userId), { title: `💬 ${name}`, body: body.slice(0, 140), url: `/staff/chat?c=${channel}`, tag: `chat-${channel}` });
  return { id: op.id, status: "done" };
}
