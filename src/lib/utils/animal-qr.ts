/** Pulls the animal token out of a scanned QR (a /q/<token> link or the bare token). */
export function parseAnimalQr(text: string): string | null {
  const t = text.trim();
  const m = t.match(/\/q\/([a-f0-9]{16,64})(?:[/?#]|$)/i) ?? t.match(/^([a-f0-9]{16,64})$/i);
  return m ? m[1].toLowerCase() : null;
}
