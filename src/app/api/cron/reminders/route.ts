import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { serviceClient } from "@/lib/server/private-settings";
import { getAttendanceSettings } from "@/lib/server/attendance";
import { sendPush } from "@/lib/server/push";

// Shift reminders on the phone, called every 10 minutes by the database's
// scheduler (pg_cron). Only a caller with the secret key may run it.
// - the evening before (18:00–22:00): "tomorrow you work the morning, 07:30"
// - 30 minutes before a shift starts: "your shift starts at 13:30"
// Each reminder is sent once (reminder_log).

export const dynamic = "force-dynamic";

const TZ = "Asia/Phnom_Penh";
const localDay = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(Date.now() + offset * 864e5));
const localMinutes = () => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
  return h * 60 + m;
};
const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};
const hm = (t: string) => t.slice(0, 5);
const SHIFT_KM: Record<string, string> = { morning: "ព្រឹក", afternoon: "រសៀល", full: "ពេញថ្ងៃ" };

async function authorised(req: Request) {
  const given = req.headers.get("x-cron-key") ?? "";
  const { data } = await serviceClient().from("private_settings").select("value").eq("key", "cron").maybeSingle();
  const secret = String((data?.value as any)?.secret ?? "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export async function GET(req: Request) {
  if (!(await authorised(req))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  const s = await getAttendanceSettings();
  const now = localMinutes();
  const today = localDay();
  const tomorrow = localDay(1);
  let sent = 0;

  const remind = async (day: string, kind: string, rows: { user_id: string; shift: string }[], text: (r: { shift: string }) => { title: string; body: string }) => {
    if (!rows.length) return;
    const { data: done } = await db.from("reminder_log").select("user_id").eq("day", day).eq("kind", kind).in("user_id", rows.map((r) => r.user_id));
    const already = new Set((done ?? []).map((d: any) => d.user_id));
    for (const r of rows.filter((x) => !already.has(x.user_id))) {
      // claim it first, so two runs at the same moment don't both send
      const { error } = await db.from("reminder_log").insert({ user_id: r.user_id, day, kind });
      if (error) continue;
      sent += await sendPush([r.user_id], { ...text(r), url: kind === "eve" ? "/staff/roster" : "/staff/checkin", tag: `shift-${day}-${kind}` });
    }
  };
  const active = async (rows: any[]) => {
    if (!rows.length) return [];
    const { data } = await db.from("staff_members").select("user_id").eq("status", "active").in("user_id", rows.map((r) => r.user_id));
    const ok = new Set((data ?? []).map((d: any) => d.user_id));
    return rows.filter((r) => ok.has(r.user_id));
  };

  // the evening before
  if (now >= 18 * 60 && now < 22 * 60) {
    const { data } = await db.from("staff_roster").select("user_id, shift").eq("day", tomorrow).neq("shift", "off");
    await remind(tomorrow, "eve", await active(data ?? []), (r) => {
      const start = r.shift === "afternoon" ? hm(s.afternoon_start) : hm(s.morning_start);
      return { title: "🗓 ស្អែកអ្នកមានវេនធ្វើការ", body: `វេន${SHIFT_KM[r.shift]} ចាប់ផ្តើមម៉ោង ${start}។ សូមមកទាន់ម៉ោង និងកុំភ្លេចស្កេនវត្តមាន។` };
    });
  }

  // 30 minutes before each half of the day (a window, as the scheduler runs every 10 minutes)
  for (const session of ["morning", "afternoon"] as const) {
    const start = toMin(session === "morning" ? s.morning_start : s.afternoon_start);
    if (now < start - 40 || now > start - 5) continue;
    const shifts = session === "morning" ? ["morning", "full"] : ["afternoon"];
    const { data } = await db.from("staff_roster").select("user_id, shift").eq("day", today).in("shift", shifts);
    await remind(today, session, await active(data ?? []), () => ({
      title: `⏰ វេន${SHIFT_KM[session]}ចាប់ផ្តើមឆាប់ៗ`,
      body: `ម៉ោង ${hm(session === "morning" ? s.morning_start : s.afternoon_start)} · នៅ ${start - now} នាទីទៀត។ មកដល់ហើយ សូមស្កេនវត្តមាន។`,
    }));
  }

  // tidy old log rows now and then
  if (Math.random() < 0.05) await db.from("reminder_log").delete().lt("day", localDay(-14));
  return NextResponse.json({ ok: true, sent, at: `${today} ${Math.floor(now / 60)}:${String(now % 60).padStart(2, "0")}` });
}
