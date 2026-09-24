// Short, human-typeable codes (avoids ambiguous chars like 0/O, 1/I).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const AVATAR_COLORS = ["#176B3A", "#2563EB", "#C0392B", "#B8791A", "#7C3AED", "#0E7C9C", "#DB2777"];
export const AVATAR_EMOJIS = ["🙂", "😎", "🧑", "👩", "🧒", "👴", "👵", "🐻"];

export function pickAvatar(seed: number) {
  return {
    color: AVATAR_COLORS[seed % AVATAR_COLORS.length],
    emoji: AVATAR_EMOJIS[seed % AVATAR_EMOJIS.length],
  };
}
