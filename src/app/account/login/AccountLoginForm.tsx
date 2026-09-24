"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/visitor/GoogleSignInButton";
import { FacebookSignInButton } from "@/components/visitor/FacebookSignInButton";
import { ForgotPasswordLink } from "@/components/visitor/ForgotPasswordLink";
import { Mail, Lock, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { markAuthEvent } from "@/components/AuthFeedback";

export function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t } = useI18n();
  // Where to go after signing in (same-site paths only).
  const requested = searchParams.get("next") ?? "/account";
  const next = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : "/account";
  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(t.auth.wrongPassword);
        setLoading(false);
        return;
      }
      markAuthEvent("welcome");
      router.push(next);
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setInfo(t.auth.created);
      setMode("signin");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-8 card-shadow">
      <h1 className="text-center font-display text-2xl font-extrabold text-forest">{t.auth.myAccount}</h1>
      <p className="mb-6 text-center text-sm text-ink/50">
        {mode === "signin" ? t.auth.signInHint : t.auth.signUpHint}
      </p>

      {searchParams.get("error") && (
        <p className="mb-3 text-sm text-red-600">{t.auth.socialFailed}</p>
      )}

      <div className="space-y-2">
        <GoogleSignInButton next={next} />
        <FacebookSignInButton next={next} />
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-black/10" /> {mode === "signin" ? t.auth.orSignIn : t.auth.orSignUp}{" "}
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="relative">
            <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              placeholder={t.auth.fullName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-full border border-black/10 py-2.5 pl-10 pr-4"
              required
            />
          </div>
        )}
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="email"
            placeholder={t.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-black/10 py-2.5 pl-10 pr-4"
            required
          />
        </div>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="password"
            placeholder={t.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-black/10 py-2.5 pl-10 pr-4"
            required
            minLength={6}
          />
        </div>

        {mode === "signin" && (
          <div className="flex justify-end">
            <ForgotPasswordLink email={email} />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-primary py-2.5 font-semibold text-white disabled:opacity-40"
        >
          {loading ? t.auth.pleaseWait : mode === "signin" ? t.auth.signIn : t.auth.createAccount}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink/50">
        {mode === "signin" ? (
          <>
            {t.auth.newHere}{" "}
            <button onClick={() => setMode("signup")} className="font-semibold text-primary">
              {t.auth.createLink}
            </button>
          </>
        ) : (
          <>
            {t.auth.haveAccount}{" "}
            <button onClick={() => setMode("signin")} className="font-semibold text-primary">
              {t.auth.signInLink}
            </button>
          </>
        )}
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-xs text-ink/40 hover:underline">
          ← {t.common.backToZoo}
        </Link>
      </p>
    </div>
  );
}
