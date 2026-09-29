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
