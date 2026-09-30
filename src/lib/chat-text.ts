// What a chat message is, in a few words (reply quotes, the chat list, copying).
// Used on the server and in the browser.
type Like = { body: string | null; kind?: string | null; files?: { name: string; type: string }[] | null; audio_url?: string | null; meta?: any };

export function msgText(m: Like, km: boolean) {
  if (m.body) return m.body;
  if (m.kind === "call") return m.meta?.video ? (km ? "📹 ការហៅជាវីដេអូ" : "📹 Video call") : km ? "📞 ការហៅជាសំឡេង" : "📞 Voice call";
  if (m.kind === "location") return km ? "📍 ទីតាំង" : "📍 Location";
  if (m.audio_url) return km ? "🎤 សារសំឡេង" : "🎤 Voice message";
  const f = m.files ?? [];
  if (f.length && f.every((x) => x.type.startsWith("image/"))) return km ? `📷 រូបភាព${f.length > 1 ? ` ${f.length}` : ""}` : `📷 Photo${f.length > 1 ? `s (${f.length})` : ""}`;
  return f.length ? `📎 ${f[0].name}` : "";
}

// Times and days for the chat, worked out by hand (Cambodia is UTC+7 all
// year), so the server and every phone write exactly the same text.
const KM_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const local = (iso: string) => new Date(Date.parse(iso) + 7 * 3600e3);

/** 14:05 */
export function chatTime(iso: string) {
  const d = local(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
/** 2026-09-30 (to tell days apart) */
export function chatDayKey(iso: string) {
  return local(iso).toISOString().slice(0, 10);
}
/** "ថ្ងៃនេះ", "ម្សិលមិញ", or "ពុធ 30 កញ្ញា" */
export function chatDay(iso: string, km: boolean) {
  const key = chatDayKey(iso);
  const today = chatDayKey(new Date().toISOString());
  const yesterday = chatDayKey(new Date(Date.now() - 864e5).toISOString());
  if (key === today) return km ? "ថ្ងៃនេះ" : "Today";
  if (key === yesterday) return km ? "ម្សិលមិញ" : "Yesterday";
  const d = local(iso);
  return km ? `${KM_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${KM_MONTHS[d.getUTCMonth()]}` : `${EN_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${EN_MONTHS[d.getUTCMonth()]}`;
}
