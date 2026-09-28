"use client";

import { createClient } from "@/lib/supabase/client";
import { idbAll, idbClear, idbDelete, idbPut } from "./idb";

// Work done while the internet is down (or too slow) is kept on the device
// and sent by itself when the connection is back. Each piece has its own id,
// so the server never counts it twice. Pieces belong to the person who made
// them: on a shared phone, one person's work is never sent as another's.

export type OpKind = "gate" | "checkin" | "chat";
export type Op = { id: string; kind: OpKind; payload: Record<string, unknown>; user: string; at: string; tries: number; error?: string };
export type LogEntry = { id: string; kind: OpKind; at: string; ok: boolean; title: string; detail?: string; seen?: boolean };

const bus = typeof window !== "undefined" ? new EventTarget() : null;
export const onQueueChange = (fn: () => void) => {
  if (!bus) return () => {};
  bus.addEventListener("change", fn);
  return () => bus.removeEventListener("change", fn);
};
const changed = () => bus?.dispatchEvent(new Event("change"));

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16));

/** Who is signed in on this device (read from the saved session, no internet needed). */
export async function currentUser(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function enqueue(kind: OpKind, payload: Record<string, unknown>): Promise<Op | null> {
  const user = await currentUser();
  if (!user) return null;
  const op: Op = { id: newId(), kind, payload, user, at: new Date().toISOString(), tries: 0 };
  await idbPut("ops", op);
  changed();
  void flush();
  return op;
}

export async function pendingOps(): Promise<Op[]> {
  const user = await currentUser();
  const all = await idbAll<Op>("ops");
  return all.filter((o) => o.user === user).sort((a, b) => a.at.localeCompare(b.at));
}

export async function syncLog(): Promise<LogEntry[]> {
  return (await idbAll<LogEntry>("log")).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
}
export async function markLogSeen() {
  for (const e of await idbAll<LogEntry>("log")) if (!e.seen) await idbPut("log", { ...e, seen: true });
  changed();
}
export async function clearLog() {
  await idbClear("log");
  changed();
}

let flushing: Promise<{ sent: number; left: number }> | null = null;
export const isFlushing = () => Boolean(flushing);

/** Sends waiting work now. Safe to call often; only one send runs at a time. */
export function flush(): Promise<{ sent: number; left: number }> {
  flushing ??= doFlush().finally(() => {
    flushing = null;
    changed();
  });
  changed();
  return flushing;
}

async function doFlush() {
  const ops = await pendingOps();
  if (!ops.length) return { sent: 0, left: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { sent: 0, left: ops.length };
  const batch = ops.slice(0, 50);
  let res: Response;
  try {
    res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops: batch.map(({ id, kind, payload, at }) => ({ id, kind, payload, at })) }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { sent: 0, left: ops.length }; // still no connection: try again later
  }
  if (res.status === 401) return { sent: 0, left: ops.length }; // signed out: keep it for when they sign in again
  const data = (await res.json().catch(() => null)) as { results?: { id: string; status: "done" | "retry" | "rejected"; title?: string; detail?: string; problem?: boolean }[] } | null;
  if (!data?.results) return { sent: 0, left: ops.length };
  let sent = 0;
  for (const r of data.results) {
    const op = batch.find((o) => o.id === r.id);
    if (!op) continue;
    if (r.status === "retry") {
      await idbPut("ops", { ...op, tries: op.tries + 1, error: r.detail });
      continue;
    }
    await idbDelete("ops", op.id);
    sent++;
    // anything the person should know about (a ticket already used, a refused count…) goes in the log
    if (r.status === "rejected" || r.problem) await idbPut("log", { id: op.id, kind: op.kind, at: new Date().toISOString(), ok: false, title: r.title ?? "", detail: r.detail } satisfies LogEntry);
  }
  // more than one batch waiting: the next tick of the sync timer sends the rest
  return { sent, left: (await pendingOps()).length };
}

/** On sign-out: forget this device's downloaded lists (waiting work stays for the same person). */
export async function forgetDeviceData() {
  await idbClear("kv");
  await idbClear("log");
  changed();
}
