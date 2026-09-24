// QR helpers. Animal QR encodes a public profile URL; ticket QR encodes a
// secure random token (see bookings.qr_token) that is validated server-side
// against the database — never trust a client-decoded payload directly.
import QRCode from "qrcode";

export function animalProfileUrl(siteUrl: string, animalCode: string) {
  return `${siteUrl}/animals/${animalCode}`;
}

/**
 * What the QR sign beside each enclosure encodes: a short link with the
 * animal's secret token (animal_qr_codes.qr_token). Only someone standing in
 * front of the sign can read it, so scanning it is real proof of a visit.
 */
export function animalQrUrl(siteUrl: string, qrToken: string) {
  return `${siteUrl}/q/${qrToken}`;
}

export function ticketUrl(siteUrl: string, bookingCode: string) {
  return `${siteUrl}/ticket/${bookingCode}`;
}

/** `withLogo`: use the highest error correction so a logo can sit in the middle and it still scans. */
export async function generateQrDataUrl(content: string, withLogo = false): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: withLogo ? "H" : "M",
    margin: 1,
    width: 512,
    color: { dark: "#17231A", light: "#FFFFFF" },
  });
}
