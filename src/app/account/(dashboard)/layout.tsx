import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Verified by middleware.ts (Supabase Auth) — no second network call here.
  if (!getVerifiedUserId()) redirect("/account/login");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      {children}
      <BottomNav />
    </div>
  );
}
