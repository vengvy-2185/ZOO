"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { Star, Trophy, PartyPopper, Check, Lock, QrCode, Target, ScanLine, MapPin, ArrowRight, XCircle } from "lucide-react";
import { QuestScanner } from "@/components/visitor/QuestScanner";
import { QuestRank, RANKS, rankFor } from "@/components/visitor/QuestRank";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { num } from "@/lib/utils/age";

type Found = {
  ok: true;
  sessionId: string;
  awarded: boolean;
  points: number;
  totalPoints: number;
  found: number;
  total: number;
  animal: { id: string; code: string; name: string; name_km: string | null; species: string | null; species_km: string | null; image: string | null };
  next: { code: string; name: string; name_km: string | null; image: string | null } | null;
};

interface AnimalRow { id: string; name: string; khmer_name: string | null; main_image_url: string | null; animal_code: string; category: { slug: string } | null }

export default function QuestPage() {
  const { locale, t } = useI18n();
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Found | { ok: false; reason: string } | null>(null);

  // Sends a token read from a real QR sign to the server, which records the discovery.
  const discover = useCallback(async (token: string) => {
    setChecking(true);
    try {
      const res = await fetch("/api/quest/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sessionId: localStorage.getItem("gwz_quest_session_id") }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("gwz_quest_session_id", data.sessionId);
        setDiscoveredIds((ids) => new Set(ids).add(data.animal.id));
        setPoints(data.totalPoints);
      }
      setResult(data.ok ? data : { ok: false, reason: data.reason ?? "invalid" });
    } catch {
      setResult({ ok: false, reason: "error" });
    } finally {
      setChecking(false);
      setScanning(false);
    }
  }, []);
  const closeScanner = useCallback(() => setScanning(false), []);

  // Opened from a QR sign with the phone's camera app (/q/<token> sends people here with ?t=),
  // or from an animal page's "Scan QR" button (?scan=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t");
    if (token && /^[a-f0-9]{16,64}$/i.test(token)) discover(token);
    else if (params.get("scan") === "1") setScanning(true);
    if (token || params.get("scan")) window.history.replaceState(null, "", "/quest");
  }, [discover]);

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
          <button
            onClick={() => {
              setResult(null);
              setScanning(true);
            }}
            className="mb-4 flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-primary to-forest p-4 text-left text-white shadow-lift transition hover:brightness-110 active:scale-[.99] sm:p-5"
          >
            <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ScanLine size={30} />
              <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-ping rounded-full bg-leaf" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-extrabold">{t.quest.scan}</span>
              <span className="block text-sm text-white/80">{t.quest.scanHint}</span>
            </span>
            <ArrowRight size={22} className="flex-shrink-0" />
          </button>

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

          <Link href="/rewards" className="mt-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-accent to-leaf p-4 font-bold text-forest shadow-soft transition hover:-translate-y-0.5">
            <Star size={22} className="flex-shrink-0" />
            <span className="min-w-0 flex-1 text-sm sm:text-base">
              {locale === "km" ? "ប្តូរពិន្ទុរបស់អ្នកជាការបញ្ចុះតម្លៃ និងអញ្ជើញមិត្តដើម្បីបានពិន្ទុបន្ថែម" : "Swap your points for discounts, and invite friends for more"}
            </span>
            <ArrowRight size={18} className="flex-shrink-0" />
          </Link>

          <QuestRank found={discovered} total={total} images={animals.filter((a) => discoveredIds.has(a.id) && a.main_image_url).map((a) => a.main_image_url!)} />

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
                  <span className={cn("text-xs font-bold", found ? "text-forest" : "text-ink/40")} title={found ? undefined : t.quest.tapToFind}>
                    {found ? (locale === "km" && a.khmer_name) || a.name : "???"}
                  </span>
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

      {scanning && <QuestScanner onToken={discover} onClose={closeScanner} busy={checking} />}
      {!scanning && checking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest/60 backdrop-blur-sm">
          <span className="rounded-2xl bg-white px-5 py-3 font-bold text-forest shadow-lift">{t.quest.checking}</span>
        </div>
      )}
      {result && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-forest/60 p-3 backdrop-blur-sm animate-[gwzFade_.2s_ease] sm:items-center" onClick={() => setResult(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-[gwzDrop_.35s_ease]" onClick={(e) => e.stopPropagation()}>
            {result.ok ? (
              <FoundCard r={result} locale={locale} t={t} onScan={() => { setResult(null); setScanning(true); }} />
            ) : (
              <div className="p-6 text-center">
                <XCircle size={44} className="mx-auto text-red-500" />
                <p className="mt-3 font-semibold text-ink/75">{result.reason === "invalid" ? t.quest.invalid : t.quest.error}</p>
                <button onClick={() => { setResult(null); setScanning(true); }} className="btn-primary mt-5 w-full hover:translate-y-0">
                  <ScanLine size={17} /> {t.quest.scanAnother}
                </button>
              </div>
            )}
          </div>
        </div>
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

function FoundCard({ r, locale, t, onScan }: { r: Found; locale: "en" | "km"; t: any; onScan: () => void }) {
  const q = t.quest;
  const name = (locale === "km" && r.animal.name_km) || r.animal.name;
  const nextName = r.next && ((locale === "km" && r.next.name_km) || r.next.name);
  return (
    <>
      <div className="relative bg-gradient-to-br from-primary to-forest px-6 pb-6 pt-7 text-center text-white">
        <span className="relative mx-auto block h-28 w-28">
          <span className="absolute inset-0 animate-ping rounded-full bg-leaf/40" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.animal.image ?? ""} alt="" className="relative h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-lift" />
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-forest ring-4 ring-white">
            <Check size={18} strokeWidth={3} />
          </span>
        </span>
        <p className="mt-4 font-display text-2xl font-extrabold leading-tight">{q.found(name)}</p>
        {((locale === "km" && r.animal.species_km) || r.animal.species) && <p className="text-sm text-white/75">{(locale === "km" && r.animal.species_km) || r.animal.species}</p>}
        <span className={cn("mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-extrabold", r.awarded ? "bg-leaf text-forest" : "bg-white/15 text-white")}>
          {r.awarded ? q.plus(r.points) : q.already}
        </span>
        {r.awarded && rankFor(r.found, r.total) > rankFor(r.found - 1, r.total) && (
          <p className="mt-3 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/25">
            {locale === "km" ? "ឋានៈថ្មី៖ " + RANKS[rankFor(r.found, r.total)].km : "New rank: " + RANKS[rankFor(r.found, r.total)].en}
          </p>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <div className="flex justify-between text-xs font-semibold text-ink/55">
            <span>{q.progressLine(num(r.found, locale), num(r.total, locale))}</span>
            <span>{q.total(num(r.totalPoints, locale))}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-light-green">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf" style={{ width: `${r.total ? (r.found / r.total) * 100 : 0}%` }} />
          </div>
        </div>
        {r.next && (
          <Link href={`/animals/${r.next.code}/map`} className="flex items-center gap-3 rounded-2xl bg-cream p-3 ring-1 ring-primary/10 transition hover:ring-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.next.image ?? ""} alt="" className="h-12 w-12 rounded-xl object-cover opacity-80 grayscale" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-ink/50">{q.nextToFind}</span>
              <span className="block truncate font-bold text-forest">{nextName}</span>
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-bold text-primary">
              <MapPin size={14} /> {q.showOnMap}
            </span>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/animals/${r.animal.code}`} className="btn-outline justify-center px-3 text-sm">
            {q.viewAnimal}
          </Link>
          <button onClick={onScan} className="btn-primary justify-center px-3 text-sm hover:translate-y-0">
            <ScanLine size={16} /> {q.scanAnother}
          </button>
        </div>
      </div>
    </>
  );
}
