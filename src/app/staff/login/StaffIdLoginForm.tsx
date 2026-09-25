"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { BadgeCheck, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { markAuthEvent } from "@/components/AuthFeedback";
import { staffSignIn, type StaffLoginState } from "./actions";

const TEXT = {
  en: {
    title: "Staff sign-in",
    sub: "Use the Staff ID and password the admin gave you.",
    id: "Staff ID",
    pw: "Password",
    go: "Sign in",
    busy: "Signing in…",
    errors: { invalid: "Staff ID or password is wrong.", inactive: "This staff account is not active. Please ask the admin.", busy: "Too many tries. Wait a minute and try again." },
    help: "No Staff ID? Staff accounts are created by the zoo admin.",
    admin: "Admin sign-in",
  },
  km: {
    title: "ចូលសម្រាប់បុគ្គលិក",
    sub: "ប្រើលេខសម្គាល់បុគ្គលិក និងពាក្យសម្ងាត់ដែលអ្នកគ្រប់គ្រងបានផ្តល់ឲ្យ។",
    id: "លេខសម្គាល់បុគ្គលិក",
    pw: "ពាក្យសម្ងាត់",
    go: "ចូល",
    busy: "កំពុងចូល…",
    errors: { invalid: "លេខសម្គាល់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។", inactive: "គណនីបុគ្គលិកនេះមិនសកម្មទេ។ សូមសួរអ្នកគ្រប់គ្រង។", busy: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំមួយនាទី។" },
    help: "មិនទាន់មានលេខសម្គាល់? គណនីបុគ្គលិកបង្កើតដោយអ្នកគ្រប់គ្រងសួនសត្វ។",
    admin: "ចូលសម្រាប់អ្នកគ្រប់គ្រង",
  },
};

function Go({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full py-3 hover:translate-y-0">
      {pending ? <Loader2 size={18} className="animate-spin" /> : null} {pending ? busy : label}
    </button>
  );
}

export function StaffIdLoginForm({ km }: { km: boolean }) {
  const L = TEXT[km ? "km" : "en"];
  const [state, action] = useFormState<StaffLoginState, FormData>(staffSignIn, {});
  useEffect(() => {
    if (state.ok) {
      markAuthEvent("welcome");
      location.href = "/staff"; // full load so every server component sees the new session
    }
  }, [state.ok]);

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white card-shadow">
      <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] px-8 pb-6 pt-7 text-center text-white">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
          <BadgeCheck size={28} />
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{L.title}</h1>
        <p className="mt-1 text-sm text-white/80">{L.sub}</p>
      </div>
      <form action={action} className="space-y-3 p-7">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.id}</span>
          <div className="relative">
            <BadgeCheck size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input
              name="staff_no"
              required
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="GWZ-S-0001"
              className="input pl-10 font-mono font-bold uppercase tracking-wider"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.pw}</span>
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input name="password" type="password" required autoComplete="current-password" className="input pl-10" />
          </div>
        </label>
        {state.error && <p className="rounded-2xl bg-red-50 p-2.5 text-center text-sm font-semibold text-red-700">{L.errors[state.error]}</p>}
        <Go label={L.go} busy={L.busy} />
        <p className="pt-1 text-center text-xs text-ink/45">{L.help}</p>
        <Link href="/admin/login" className="flex items-center justify-center gap-1.5 pt-1 text-xs font-bold text-ink/50 hover:text-primary">
          <ShieldCheck size={13} /> {L.admin}
        </Link>
      </form>
    </div>
  );
}
