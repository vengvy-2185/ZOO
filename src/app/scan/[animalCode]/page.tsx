import { redirect, notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// This route is what the physical QR code beside each enclosure points to.
// It logs the scan (a public write that RLS intentionally does not allow
// from the browser — see 0003_rls.sql) using the service-role client, which
// only ever runs server-side, then redirects to the public animal profile.
export default async function ScanAnimalPage({ params }: { params: { animalCode: string } }) {
  const supabase = createClient();
  const { data: animal } = await supabase
    .from("animals")
    .select("id, animal_code, status")
    .eq("animal_code", params.animalCode)
    .single();

  if (!animal || animal.status !== "active") {
    notFound();
  }

  try {
    const admin = createServiceRoleClient();
    // Supabase returns RPC failures as `error` rather than rejecting.
    const { error } = await admin.rpc("increment_qr_scan", { p_animal_id: animal.id });
    if (error) {
      // Fallback if the increment_qr_scan() RPC hasn't been created yet —
      // see supabase/migrations/0002_functions.sql for the recommended
      // atomic version; this keeps the redirect working either way.
      const { data: qr } = await admin
        .from("animal_qr_codes")
        .select("id, scan_count")
        .eq("animal_id", animal.id)
        .single();
      if (qr) {
        await admin.from("animal_qr_codes").update({ scan_count: qr.scan_count + 1 }).eq("id", qr.id);
      }
    }
  } catch {
    // Never block the visitor experience if scan logging fails.
  }

  redirect(`/animals/${animal.animal_code}?scanned=1`);
}
