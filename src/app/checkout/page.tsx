import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { CheckoutClient } from "./CheckoutClient";
import { getSessionUser } from "@/lib/auth/session";
import { claimSignupReferral } from "@/lib/server/points";
import { SignInRequired } from "@/components/visitor/SignInRequired";
import { getI18n } from "@/lib/i18n/server";

// Server shell (site header/tab bar need the session + language cookies);
// the cart form itself reads sessionStorage, so it lives in CheckoutClient.
export default async function CheckoutPage() {
  // Signed-in visitors don't retype their name and email: they come from the account.
  const me = await getSessionUser();
  if (me) await claimSignupReferral(me.id).catch(() => {});
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      {/* Buying needs an account: tickets, points and receipts belong to someone. */}
      {me ? (
        <CheckoutClient me={{ name: me.fullName ?? "", email: me.email ?? "" }} />
      ) : (
        <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
          <SignInRequired next="/checkout" km={getI18n().locale === "km"} />
        </main>
      )}
      <BottomNav />
    </div>
  );
}
