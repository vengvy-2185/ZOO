import { redirect } from "next/navigation";

// The QR sign beside each enclosure points here (see animalQrUrl). Scanning it
// with the phone's normal camera opens the Animal Quest, which checks the
// token with the server and adds the animal to the visitor's collection.
export default function AnimalQrLink({ params }: { params: { token: string } }) {
  const token = /^[a-f0-9]{16,64}$/i.test(params.token) ? params.token.toLowerCase() : "";
  redirect(token ? `/quest?t=${token}` : "/quest");
}
