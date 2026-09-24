import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { CheckoutClient } from "./CheckoutClient";
import { getSessionUser } from "@/lib/auth/session";
import { claimSignupReferral } from "@/lib/server/points";

// Server shell (site header/tab bar need the session + language cookies);
// the cart form itself reads sessionStorage, so it lives in CheckoutClient.
export default async function CheckoutPage() {
  // Signed-in visitors don't retype their name and email: they come from the account.
  const me = await getSessionUser();
  if (me) await claimSignupReferral(me.id).catch(() => {});
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <CheckoutClient me={me ? { name: me.fullName ?? "", email: me.email ?? "" } : null} />
      <BottomNav />
    </div>
  );
}
