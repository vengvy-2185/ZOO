import { redirect } from "next/navigation";

// Old links (/scan/<animal code>) used to count as a quest scan just by being
// opened. A visit now only counts when the QR sign at the enclosure is really
// scanned (see /q/[token]), so these links simply open the animal's page.
export default function OldScanLink({ params }: { params: { animalCode: string } }) {
  redirect(`/animals/${encodeURIComponent(params.animalCode)}`);
}
