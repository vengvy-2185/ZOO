import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Two-step sign-in: an admin who has set up a code app must also enter a
 * 6-digit code after the password. true = this session still needs the code.
 */
export async function needsSecondStep() {
  try {
    const { data } = await createClient().auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}
