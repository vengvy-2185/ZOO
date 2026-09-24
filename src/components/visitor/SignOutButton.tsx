"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markAuthEvent } from "@/components/AuthFeedback";

export function SignOutButton({
  redirectTo = "/",
  label = "Sign Out",
  className = "text-sm font-medium text-ink/50 hover:text-red-600",
  children,
}: {
  redirectTo?: string;
  label?: string;
  className?: string;
  /** Optional content (e.g. an icon); `label` is then used as the accessible name. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    markAuthEvent("bye");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={signOut} className={className} aria-label={children ? label : undefined} title={children ? label : undefined}>
      {children ?? label}
    </button>
  );
}
