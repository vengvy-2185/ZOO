"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/visitor/GoogleSignInButton";
import { FacebookSignInButton } from "@/components/visitor/FacebookSignInButton";
import { ForgotPasswordLink } from "@/components/visitor/ForgotPasswordLink";
import { markAuthEvent } from "@/components/AuthFeedback";
import { useI18n } from "@/lib/i18n/client";

// Shared by /admin/login and /staff/login. The role check here is only a
// friendly early message — the admin/staff layouts enforce the role on the
// server for every request (Google sign-in skips this form entirely).
export function TeamLoginForm({ role }: { role: "admin" | "staff" }) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = role === "admin" ? "/admin" : "/staff/scanner";
  const Icon = role === "admin" ? ShieldCheck : ScanLine;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(t.auth.invalid);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    const allowed = role === "admin" ? profile?.role === "admin" : profile?.role === "staff" || profile?.role === "admin";
    if (!allowed) {
      await supabase.auth.signOut();
      setError(role === "admin" ? t.auth.noAdmin : t.auth.noStaff);
      setLoading(false);
      return;
    }
    markAuthEvent("welcome");
    router.push(next);
  }

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-8 card-shadow">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
        <Icon size={26} />
      </span>
      <h1 className="mt-3 text-center font-display text-2xl font-extrabold text-forest">
        {role === "admin" ? t.auth.adminLogin : t.auth.staffLogin}
      </h1>
      <p className="mb-6 text-center text-sm text-ink/50">{t.auth.management}</p>

      <div className="space-y-2">
        <GoogleSignInButton next={next} />
        <FacebookSignInButton next={next} />
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-black/10" /> {t.auth.orEmail} <span className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input type="email" placeholder={t.auth.workEmail} value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" required />
        </div>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input type="password" placeholder={t.auth.password} value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" required />
        </div>
        <div className="flex justify-end">
          <ForgotPasswordLink email={email} />
        </div>
        {error && <p className="rounded-2xl bg-red-50 p-2.5 text-center text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="btn-primary w-full py-3 hover:translate-y-0">
          {loading ? t.auth.signingIn : t.auth.signIn}
        </button>
      </form>
    </div>
  );
}
