import { redirect } from "next/navigation";

// Check-in happens inline within the scanner flow (scan → validate → CHECK IN
// button) — this route exists per the spec's route list and simply forwards
// staff here so no link in the app ever 404s.
export default function StaffCheckinRedirect() {
  redirect("/staff/scanner");
}
