import "server-only";
import webpush from "web-push";
import { serviceClient } from "./private-settings";
import { getSiteUrl } from "./site-url";

// Phone notifications (Web Push). The keys are made once and kept in the
// admin-only private_settings table; the public half is given to phones so
// they can subscribe. Sending never blocks the action that caused it.

type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

export async function pushKeys(): Promise<Keys> {
  if (cached) return cached;
  const db = serviceClient();
  const { data } = await db.from("private_settings").select("value").eq("key", "push").maybeSingle();
  let v = data?.value as Keys | undefined;
  if (!v?.publicKey || !v?.privateKey) {
    const fresh = webpush.generateVAPIDKeys();
    // another server may make keys at the same moment: the first one saved wins
    await db.from("private_settings").insert({ key: "push", value: fresh });
    const again = await db.from("private_settings").select("value").eq("key", "push").maybeSingle();
    v = (again.data?.value as Keys) ?? fresh;
  }
  cached = v;
  return v;
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string; urgent?: boolean };

/** Sends a notification to every phone of these people. Dead subscriptions are removed. */
export async function sendPush(userIds: string[], msg: PushMessage) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return 0;
  try {
    const keys = await pushKeys();
    webpush.setVapidDetails(`mailto:no-reply@${new URL(getSiteUrl()).hostname}`, keys.publicKey, keys.privateKey);
    const db = serviceClient();
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids);
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/staff", tag: msg.tag, urgent: msg.urgent ?? false });
    let sent = 0;
    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12, urgency: msg.urgent ? "high" : "normal", timeout: 6000 });
          sent++;
          await db.from("push_subscriptions").update({ last_ok: new Date().toISOString() }).eq("id", s.id);
        } catch (e: any) {
          // the phone unsubscribed or the browser was reset
          if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        }
      })
    );
    return sent;
  } catch (e) {
    console.warn("push:", e);
    return 0;
  }
}

/** Everyone active on a team (or all active staff when no team). */
export async function staffIds(team?: string | null) {
  const { data } = await serviceClient().from("staff_members").select("user_id, position:staff_positions(permissions)").eq("status", "active");
  return ((data ?? []) as any[]).filter((s) => !team || (s.position?.permissions ?? []).includes(team)).map((s) => s.user_id as string);
}

/** Admins, managers (reports) and the people allowed to change the schedule. */
export async function managerIds() {
  const db = serviceClient();
  const [{ data: admins }, { data: staff }] = await Promise.all([
    db.from("profiles").select("id").eq("role", "admin"),
    db.from("staff_members").select("user_id, position:staff_positions(permissions)").eq("status", "active"),
  ]);
  return [
    ...(admins ?? []).map((a: any) => a.id as string),
    ...((staff ?? []) as any[]).filter((s) => (s.position?.permissions ?? []).some((p: string) => p === "reports" || p === "roster")).map((s) => s.user_id as string),
  ];
}
