"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";

export function ForgotPasswordLink({ email }: { email: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [localEmail, setLocalEmail] = useState(email);

  async function send() {
    if (!localEmail) return;
    setSending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(localEmail, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    setSending(false);
    setSent(true);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary hover:underline">
        {t.auth.forgot}
      </button>
    );
  }

  if (sent) {
    return <p className="text-xs text-primary">{t.auth.checkEmail(localEmail)}</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        placeholder={t.auth.yourEmail}
        value={localEmail}
        onChange={(e) => setLocalEmail(e.target.value)}
        className="flex-1 rounded-full border border-black/10 px-3 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={send}
        disabled={sending || !localEmail}
        className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {sending ? t.auth.sending : t.auth.sendLink}
      </button>
    </div>
  );
}
