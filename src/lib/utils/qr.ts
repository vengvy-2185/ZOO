// QR helpers. Animal QR encodes a public profile URL; ticket QR encodes a
// secure random token (see bookings.qr_token) that is validated server-side
// against the database — never trust a client-decoded payload directly.
import QRCode from "qrcode";

export function animalProfileUrl(siteUrl: string, animalCode: string) {
  return `${siteUrl}/animal/${animalCode}`;
}

export function ticketUrl(siteUrl: string, bookingCode: string) {
  return `${siteUrl}/ticket/${bookingCode}`;
}

export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    margin: 1,
    width: 512,
    color: { dark: "#17231A", light: "#FFFFFF" },
  });
}
