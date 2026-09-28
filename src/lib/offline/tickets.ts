"use client";

import { idbGet, idbPut } from "./idb";
import { currentUser, enqueue } from "./queue";

// The gate scanner keeps today's ticket list on the device. When the
// internet is down, a scanned ticket is checked against this list and the
// check-in is sent later. Tickets are found by a hash of their QR token.

export type OfflineTicket = { h: string; code: string; name: string | null; status: "pending" | "confirmed"; visitDate: string; visitors: number; items: { name: string; name_km: string | null; quantity: number }[]; checkedInAt: string | null };
type Saved = { k: "tickets"; user: string; day: string; at: string; tickets: OfflineTicket[] };

/** Same as the server: the QR holds a link …/ticket/CODE?k=TOKEN, or the token itself. */
export function extractToken(raw: string) {
  const s = raw.trim();
  try {
    const k = new URL(s).searchParams.get("k");
    if (k) return k;
  } catch {
    /* not a link */
  }
  return s;
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function savedList(): Promise<Saved | null> {
  const s = await idbGet<Saved>("kv", "tickets");
  if (!s) return null;
  return s.user === (await currentUser()) ? s : null;
}

/** Downloads today's tickets (keeps the ones this device already let in). */
export async function refreshTicketList(): Promise<Saved | null> {
  try {
    const r = await fetch("/api/staff/offline-tickets", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) return savedList();
    const j = (await r.json()) as { day: string; at: string; tickets: OfflineTicket[] };
    const user = await currentUser();
    if (!user) return null;
    const old = await savedList();
    const localIn = new Map((old?.day === j.day ? old.tickets : []).filter((t) => t.checkedInAt).map((t) => [t.h, t.checkedInAt]));
    const tickets = j.tickets.map((t) => (t.checkedInAt || !localIn.has(t.h) ? t : { ...t, checkedInAt: localIn.get(t.h)! }));
    const saved: Saved = { k: "tickets", user, day: j.day, at: j.at, tickets };
    await idbPut("kv", saved);
    return saved;
  } catch {
    return savedList();
  }
}

export type OfflineVerdict = "ok" | "already" | "unpaid" | "cancelled" | "wrong_date" | "unknown";

/** Checks a ticket against the saved list; an OK ticket is marked here and sent to the server later. */
export async function checkOffline(raw: string, force = false): Promise<{ verdict: OfflineVerdict; ticket?: OfflineTicket; checkedInAt?: string }> {
  const token = extractToken(raw);
  const list = await savedList();
  if (!list || !/^[A-Za-z0-9_-]{6,128}$/.test(token)) return { verdict: "unknown" };
  const h = await sha256(token);
  const t = list.tickets.find((x) => x.h === h);
  if (!t) return { verdict: "unknown" };
  if (t.checkedInAt) return { verdict: "already", ticket: t, checkedInAt: t.checkedInAt };
  if (t.status !== "confirmed") return { verdict: "unpaid", ticket: t };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  if (t.visitDate !== today && !force) return { verdict: "wrong_date", ticket: t };
  const at = new Date().toISOString();
  await enqueue("checkin", { token, force });
  t.checkedInAt = at;
  await idbPut("kv", list);
  return { verdict: "ok", ticket: t, checkedInAt: at };
}

/** A ticket the list doesn't know (bought after the last download): let in now, checked when the internet is back. */
export async function allowUnknown(raw: string) {
  await enqueue("checkin", { token: extractToken(raw), force: false });
}

/** After an online scan: keep the saved list in step. */
export async function markScanned(raw: string, at: string) {
  const list = await savedList();
  if (!list) return;
  const h = await sha256(extractToken(raw));
  const t = list.tickets.find((x) => x.h === h);
  if (t && !t.checkedInAt) {
    t.checkedInAt = at;
    await idbPut("kv", list);
  }
}
