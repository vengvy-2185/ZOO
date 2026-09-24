"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Searchable question list; each answer opens smoothly on tap. */
export function FaqList() {
  const { t } = useI18n();
  const f = t.faq;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return f.items.map((it, i) => ({ ...it, i })).filter((it) => !needle || `${it.q} ${it.a}`.toLowerCase().includes(needle));
  }, [q, f.items]);

  return (
    <div className="mx-auto max-w-3xl">
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.search} className="input pl-12" />
      </label>
      <div className="mt-5 space-y-3">
        {items.map((it) => {
          const isOpen = open === it.i;
          return (
            <div key={it.i} className={`card overflow-hidden transition ${isOpen ? "ring-2 ring-primary/30" : ""}`}>
              <button onClick={() => setOpen(isOpen ? null : it.i)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className="flex-1 font-display text-base font-bold text-forest">{it.q}</span>
                <ChevronDown size={18} className={`flex-shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink/70">{it.a}</p>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="card p-6 text-center text-sm text-ink/55">{f.none}</p>}
      </div>
    </div>
  );
}
