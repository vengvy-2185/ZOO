// Tickets bought on this device, so guests (no account) can always find them
// again from the "My tickets" button. Only the booking code + its secret key
// are stored, in this browser only.
const KEY = "gwz_tickets";
export const MY_TICKETS_EVENT = "gwz-tickets-changed";

export type SavedTicket = { code: string; k: string; savedAt: number };

export function readSavedTickets(): SavedTicket[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((t) => t && typeof t.code === "string" && typeof t.k === "string") : [];
  } catch {
    return [];
  }
}

export function rememberTicket(code: string, k: string) {
  try {
    const list = readSavedTickets().filter((t) => t.code !== code);
    list.unshift({ code, k, savedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
    window.dispatchEvent(new Event(MY_TICKETS_EVENT));
  } catch {
    /* storage may be blocked — the account page still lists signed-in tickets */
  }
}
