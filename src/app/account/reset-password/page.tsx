"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Supabase's JS client automatically picks up the recovery session from
    // the URL fragment on this page, so this just sets the new password.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/account"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 card-shadow">
        <h1 className="text-center font-display text-2xl font-extrabold text-forest">🦁 {t.auth.resetTitle}</h1>
        {done ? (
          <p className="mt-6 text-center text-sm text-primary">{t.auth.passwordUpdated}</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="password"
                placeholder={t.auth.newPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-black/10 py-2.5 pl-10 pr-4"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {loading ? t.common.saving : t.auth.updatePassword}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
