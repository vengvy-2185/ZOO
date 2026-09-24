"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Shield, Crown, Check, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { ADOPTION_TIERS, type AdoptionTier } from "@/lib/data/adoption";

export interface AdoptAnimal {
  code: string;
  name: string;
  name_km: string | null;
  species: string | null;
  species_km: string | null;
  image: string | null;
}

const TIER_ICON = { friend: Heart, guardian: Shield, hero: Crown } as const;

export function AdoptForm({ animals, initialCode, me, km }: { animals: AdoptAnimal[]; initialCode?: string; me: { name: string; email: string } | null; km: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(initialCode && animals.some((a) => a.code === initialCode) ? initialCode : animals[0]?.code);
  const [tier, setTier] = useState<AdoptionTier>("guardian");
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = t.adopt;
  const chosen = animals.find((x) => x.code === code);
  const nm = (x: AdoptAnimal) => (locale === "km" && x.name_km) || x.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animalCode: code, tier, name, email, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Error");
      setBusy(false);
      return;
    }
    router.push(`/adopt/${data.code}?k=${data.accessKey}`);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section>
        <h2 className="section-title mb-4 text-xl md:text-2xl">{a.choose}</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {animals.map((x) => (
            <button
              key={x.code}
              type="button"
              onClick={() => setCode(x.code)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left ring-2 transition",
                code === x.code ? "ring-primary shadow-lift" : "ring-transparent hover:ring-primary/30"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.image ?? ""} alt="" className="aspect-square w-full bg-light-green object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-xs font-bold text-white">{nm(x)}</span>
              {code === x.code && (
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-4 text-xl md:text-2xl">{a.tier}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(ADOPTION_TIERS) as AdoptionTier[]).map((k) => {
            const Icon = TIER_ICON[k];
            const on = tier === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTier(k)}
                className={cn(
                  "relative rounded-3xl p-5 text-left ring-2 transition",
                  on ? "bg-primary text-white ring-primary shadow-lift" : "bg-white ring-black/5 hover:ring-primary/30"
                )}
              >
                <Icon size={26} className={on ? "text-leaf" : "text-primary"} />
                <div className="mt-2 font-display text-lg font-bold">{a.tiers[k].name}</div>
                <div className="font-display text-3xl font-extrabold">${ADOPTION_TIERS[k]}</div>
                <div className={cn("mt-1 text-xs", on ? "text-white/80" : "text-ink/55")}>{a.tiers[k].desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="section-title text-xl md:text-2xl">{a.details}</h2>
        <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={a.name} className="input" />
        <input type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={a.email} className="input" />
        <textarea maxLength={200} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={a.message} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary" />
        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {me ? (
          <button disabled={busy || !name || !code} className="btn-primary w-full py-3.5 text-base hover:translate-y-0">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />} {chosen ? a.submit(`${nm(chosen)} ($${ADOPTION_TIERS[tier]})`) : ""}
          </button>
        ) : (
          // Adopting needs an account; come back to the same animal after signing in.
          <Link href={`/account/login?next=${encodeURIComponent(`/adopt?animal=${code ?? ""}`)}`} className="btn-primary w-full py-3.5 text-base hover:translate-y-0">
            <LogIn size={18} /> {km ? "ចូលគណនី ដើម្បីឧបត្ថម្ភ" : "Sign in to adopt"}
          </Link>
        )}
      </section>
    </form>
  );
}
