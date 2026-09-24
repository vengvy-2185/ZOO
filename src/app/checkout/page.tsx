import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { CheckoutClient } from "./CheckoutClient";

// Server shell (site header/tab bar need the session + language cookies);
// the cart form itself reads sessionStorage, so it lives in CheckoutClient.
export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <CheckoutClient />
      <BottomNav />
    </div>
  );
}
