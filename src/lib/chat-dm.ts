// Private chats between two people: the room name holds both ids
// ("dm:<a>:<b>", sorted), so only those two can ever open it.

const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DM_RE = new RegExp(`^dm:(${ID}):(${ID})$`);

export const isDm = (ch: string) => DM_RE.test(ch);
export const dmKey = (a: string, b: string) => `dm:${[a, b].sort().join(":")}`;
/** Is this person one of the two in the private chat? */
export const inDm = (ch: string, userId: string) => {
  const m = ch.match(DM_RE);
  return Boolean(m && (m[1] === userId || m[2] === userId) && m[1] !== m[2]);
};
/** The other person in a private chat. */
export const dmPeer = (ch: string, me: string) => {
  const m = ch.match(DM_RE);
  return m ? (m[1] === me ? m[2] : m[1]) : null;
};
/** Storage folders can't have ":" in them. */
export const chatDir = (ch: string) => ch.replace(/:/g, "_");
