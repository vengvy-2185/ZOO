"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

// Uses the phone's native share sheet when available (Telegram, Facebook,
// Messenger…), otherwise copies the link.
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      return; // user closed the share sheet
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} className={cn("btn border-2 border-primary/15 bg-white py-3 text-primary hover:border-primary", className)}>
      {copied ? <Check size={17} /> : <Share2 size={17} />} <span className="truncate">{copied ? t.extra.copied : t.extra.share}</span>
    </button>
  );
}
