"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { Star, Trophy, PartyPopper, Check, Lock, QrCode, Target } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { num } from "@/lib/utils/age";

interface AnimalRow { id: string; name: string; khmer_name: string | null; main_image_url: string | null; animal_code: string; category: { slug: string } | null }

export default function QuestPage() {
  const { locale, t } = useI18n();
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: allAnimals } = await supabase
        .from("animals")
        .select("id, name, khmer_name, main_image_url, animal_code, category:category_id(slug)")
        .eq("status", "active");
      setAnimals((allAnimals ?? []) as unknown as AnimalRow[]);

      const sessionId = localStorage.getItem("gwz_quest_session_id");
      if (sessionId) {
        const [{ data: discoveries }, { data: session }] = await Promise.all([
          supabase.from("quest_discoveries").select("animal_id").eq("session_id", sessionId),
          supabase.from("quest_sessions").select("points").eq("id", sessionId).single(),
        ]);
        setDiscoveredIds(new Set((discoveries ?? []).map((d) => d.animal_id)));
        setPoints(session?.points ?? 0);
      }
      setLoading(false);
    })();
  }, []);

  const total = animals.length;
  const discovered = discoveredIds.size;
  const progress = total > 0 ? Math.round((discovered / total) * 100) : 0;
  const complete = total > 0 && discovered === total;

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6">
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={Target} label={t.quest.discovered} value={`${num(discovered, locale)} / ${num(total, locale)}`} />
            <Stat icon={Star} label={t.quest.points} value={num(points, locale)} accent />
            <div className="card p-5">
              <div className="flex items-center justify-between text-sm font-semibold text-forest">
                <span>{t.quest.progress}</span>
                <span>{num(progress, locale)}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-light-green">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink/50">{complete ? t.quest.allDone : t.quest.keepExploring}</p>
            </div>
          </div>

          {complete && (
            <div className="mt-4 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-accent to-leaf p-5 text-forest shadow-lift">
              <PartyPopper size={36} className="flex-shrink-0" />
              <div>
                <p className="font-display text-xl font-extrabold">{t.quest.congrats}</p>
                <p className="text-sm">{t.quest.congratsText(num(total, locale))}</p>
              </div>
              <Trophy size={36} className="ml-auto flex-shrink-0" />
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-3xl bg-cream p-4 ring-1 ring-primary/10">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
              <QrCode size={22} />
            </span>
            <p className="text-sm text-ink/70">
              {t.quest.howTo}
            </p>
          </div>

          <h2 className="section-title mt-10 text-xl md:text-2xl">{t.quest.collection}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" data-reveal-stagger="zoom">
            {animals.map((a) => {
              const found = discoveredIds.has(a.id);
              const Icon = getCategoryIcon(a.category?.slug);
              return (
                <Link
                  key={a.id}
                  href={`/animals/${a.animal_code}`}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-3xl p-2 pb-3 text-center transition hover:-translate-y-0.5",
                    found ? "bg-white shadow-soft ring-2 ring-primary/30" : "bg-white/50 ring-1 ring-black/5"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl",
                      found ? "bg-primary text-white" : "bg-black/5 text-ink/30"
                    )}
                  >
                    {a.main_image_url ? (
                      // Undiscovered animals stay a blurred, grey mystery until scanned.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.main_image_url}
                        alt=""
                        className={cn("h-full w-full object-cover transition duration-500", !found && "scale-110 opacity-40 blur-[3px] grayscale")}
                      />
                    ) : (
                      <Icon size={24} />
                    )}
                  </span>
                  <span className={cn("text-xs font-bold", found ? "text-forest" : "text-ink/40")}>{found ? (locale === "km" && a.khmer_name) || a.name : "???"}</span>
                  <span
                    className={cn(
                      "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full",
                      found ? "bg-leaf text-forest" : "bg-black/5 text-ink/30"
                    )}
                  >
                    {found ? <Check size={12} strokeWidth={3} /> : <Lock size={10} />}
                  </span>
                </Link>
              );
            })}
          </div>
          {total === 0 && <p className="mt-4 text-sm text-ink/50">{t.quest.noAnimals}</p>}
        </>
      )}
    </main>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-3xl p-5 shadow-soft", accent ? "bg-primary text-white" : "bg-white")}>
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", accent ? "bg-white/15" : "bg-light-green text-primary")}>
        <Icon size={24} />
      </span>
      <div>
        <div className={cn("text-xs font-semibold", accent ? "text-white/70" : "text-ink/50")}>{label}</div>
        <div className={cn("font-display text-3xl font-extrabold leading-none", accent ? "text-white" : "text-forest")}>{value}</div>
      </div>
    </div>
  );
}
