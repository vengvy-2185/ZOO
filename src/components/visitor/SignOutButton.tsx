"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markAuthEvent } from "@/components/AuthFeedback";
import { forgetDeviceData } from "@/lib/offline/queue";

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
    // this device forgets what it saved for this person (work not sent yet stays for their next sign-in)
    await forgetDeviceData().catch(() => {});
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
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
