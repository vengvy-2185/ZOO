import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { NavbarClient } from "./NavbarClient";
import { NoticeBar } from "./NoticeBar";
import { getActiveAnimals } from "@/lib/data/zoo";

// Server half: works out who is signed in (and whether they're staff/admin,
// to offer a shortcut to their dashboard); NavbarClient does the rendering.
// Verifies the session token locally (no call to Supabase Auth) and reads
// the cached role, so the header adds no database round trip. Protected
// pages are still guarded by middleware + their layouts.
export async function Navbar() {
  const [user, allAnimals] = await Promise.all([getSessionUser(), getActiveAnimals()]);
  const animals = (allAnimals as any[]).map((a) => ({
    code: a.animal_code,
    name: a.name,
    name_km: a.khmer_name,
    species: a.species?.common_name ?? null,
    species_km: a.species?.khmer_name ?? null,
    image: a.main_image_url,
  }));

  // user.id comes from a signature-verified token, so the cached role lookup is safe.
  const role = user ? (await getCachedRole(user.id)).role : null;

  return (
    <>
      <NoticeBar />
      <NavbarClient signedIn={!!user} displayName={user?.fullName ?? user?.email ?? null} avatarUrl={user?.avatarUrl ?? null} role={role} animals={animals} />
    </>
  );
}
