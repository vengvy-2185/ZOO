"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, Loader2, Trash2, CheckCircle2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markAuthEvent } from "@/components/AuthFeedback";

const codeInput = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-ink outline-none focus:border-primary";

/** Sign-in step 2: type the 6-digit code from the code app. */
export function MfaVerify({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const verify = async () => {
    setBusy(true);
    setErr("");
    const sb = createClient();
    const { data } = await sb.auth.mfa.listFactors();
    const f = data?.totp?.find((x) => x.status === "verified");
    if (!f) return router.replace(next);
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code });
    setBusy(false);
    if (error) return setErr("លេខកូដមិនត្រឹមត្រូវ ឬផុតពេល។ សូមវាយលេខថ្មីពីកម្មវិធី។");
    router.replace(next);
    router.refresh();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) verify();
      }}
      className="card w-full max-w-sm p-6 text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-light-green text-primary"><ShieldCheck size={28} /></span>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-forest">ការចូលពីរជំហាន</h1>
      <p className="mt-1 text-sm text-ink/60">បើកកម្មវិធីលេខកូដនៅលើទូរស័ព្ទ (Google Authenticator ឬ Microsoft Authenticator) ហើយវាយលេខ ៦ ខ្ទង់។</p>
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="000000" className={`${codeInput} mt-4`} />
      {err && <p className="mt-2 text-sm font-bold text-red-600">{err}</p>}
      <button disabled={busy || code.length !== 6} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-extrabold text-white disabled:opacity-60">
        {busy && <Loader2 size={18} className="animate-spin" />} ផ្ទៀងផ្ទាត់
      </button>
      <button
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          markAuthEvent("bye");
          router.replace("/admin/login");
        }}
        className="mt-3 text-sm font-bold text-ink/50 hover:text-red-600"
      >
        ចាកចេញ
      </button>
    </form>
  );
}

/** Admin → Sign-in security: set up or remove the code app. */
export function MfaSetup() {
  const [factors, setFactors] = useState<{ id: string; name: string; created: string }[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors((data?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id, name: f.friendly_name ?? "Authenticator", created: f.created_at })));
  };
  useEffect(() => {
    load();
  }, []);

  const start = async () => {
    setBusy(true);
    setMsg(null);
    const sb = createClient();
    // a half-finished setup from before is removed first
    const { data: all } = await sb.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `GWZ ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, text: `មិនអាចចាប់ផ្តើមបានទេ៖ ${error?.message ?? ""}` });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async () => {
    if (!enroll) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "លេខកូដមិនត្រឹមត្រូវ។ សូមវាយលេខថ្មីដែលកំពុងបង្ហាញក្នុងកម្មវិធី។" });
    setEnroll(null);
    setCode("");
    setMsg({ ok: true, text: "បានបើកការចូលពីរជំហានហើយ ✓ ពេលចូលលើកក្រោយ នឹងត្រូវវាយលេខកូដពីកម្មវិធី។" });
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("បិទការចូលពីរជំហាន? គណនីនឹងមានសុវត្ថិភាពតិចជាងមុន។")) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    setMsg(error ? { ok: false, text: `មិនអាចបិទបានទេ៖ ${error.message}` } : { ok: true, text: "បានបិទការចូលពីរជំហាន។" });
    load();
  };

  return (
    <section className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><KeyRound size={20} className="text-primary" /> ការចូលពីរជំហាន (លេខកូដពីទូរស័ព្ទ)</h2>
      <p className="text-sm text-ink/65">បន្ទាប់ពីពាក្យសម្ងាត់ ត្រូវវាយលេខ ៦ ខ្ទង់ពីកម្មវិធីនៅលើទូរស័ព្ទរបស់អ្នក។ ទោះបីនរណាម្នាក់ដឹងពាក្យសម្ងាត់ ក៏មិនអាចចូលផ្ទាំងគ្រប់គ្រងបានដែរ បើគ្មានទូរស័ព្ទរបស់អ្នក។</p>
      {factors === null ? (
        <Loader2 className="animate-spin text-primary" />
      ) : factors.length ? (
        <ul className="space-y-2">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-light-green px-4 py-3">
              <CheckCircle2 size={20} className="text-primary" />
              <span className="flex-1 text-sm font-bold text-forest">បានបើក · {f.name}</span>
              <button type="button" onClick={() => remove(f.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50"><Trash2 size={13} /> បិទ</button>
            </li>
          ))}
        </ul>
      ) : enroll ? (
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR" className="mx-auto h-48 w-48 rounded-2xl bg-white p-2 ring-1 ring-black/10" />
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/70">
              <li>ដំឡើង <b>Google Authenticator</b> ឬ <b>Microsoft Authenticator</b> លើទូរស័ព្ទ។</li>
              <li>ក្នុងកម្មវិធី ចុច «+» ហើយស្កេន QR នេះ។</li>
              <li>វាយលេខ ៦ ខ្ទង់ដែលកម្មវិធីបង្ហាញ ហើយចុច «បញ្ជាក់»។</li>
            </ol>
            <p className="break-all rounded-xl bg-cream px-3 py-2 font-mono text-xs text-ink/60">ស្កេនមិនបាន? វាយកូដនេះដោយដៃ៖ {enroll.secret}</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" className={codeInput} />
              <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="rounded-2xl bg-primary px-5 font-extrabold text-white disabled:opacity-60">{busy ? <Loader2 className="animate-spin" /> : "បញ្ជាក់"}</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={start} disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-extrabold text-white">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />} បើកការចូលពីរជំហាន
        </button>
      )}
      {msg && <p className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${msg.ok ? "bg-light-green text-primary" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}
