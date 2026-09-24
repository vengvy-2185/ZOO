"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** A submit button that asks "are you sure?" first. */
export function ConfirmSubmit({ label, question, className, children }: { label?: string; question: string; className?: string; children?: React.ReactNode }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
    >
      {children ?? label}
    </button>
  );
}

/** Submit button that turns off while saving, so one click never counts twice. */
export function PendingSubmit({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
