"use client";

import { useEffect, useMemo, useState } from "react";
import { Ruler, Weight, Gauge, Sparkles, User } from "lucide-react";
import type { CompareAnimal, CompareMetric } from "@/lib/data/compare";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

const UNIT: Record<CompareMetric, string> = {
  height: "cm",
  weight: "kg",
  speed: "km/h",
};
const LIMIT: Record<CompareMetric, [number, number]> = {
  height: [60, 220],
  weight: [10, 150],
  speed: [3, 45],
};

type Row = {
  key: string;
  name: string;
  image: string | null;
  value: number;
  color: string;
  me: boolean;
};

/** Round photo: the animal's real picture, or the visitor's profile picture. */
function Face({
  row,
  avatar,
  size,
}: {
  row: Row;
  avatar: string | null;
  size: string;
}) {
  const src = row.me ? avatar : row.image;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={cn(
        "rounded-full object-cover shadow-soft ring-2",
        row.me ? "ring-leaf" : "ring-white",
        size,
      )}
    />
  ) : (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-white shadow-soft ring-2 ring-leaf",
        size,
      )}
    >
      <User size={16} />
    </span>
  );
}

/** Interactive "how do I measure up?" comparison with the zoo's real animals. */
export function MeVsAnimals({
  animals,
  me: profile,
}: {
  animals: CompareAnimal[];
  me: { name: string | null; avatar: string | null };
}) {
  const { t } = useI18n();
  const c = t.compare;
  const [me, setMe] = useState({ height: 150, weight: 45, speed: 20 });
  const [metric, setMetric] = useState<CompareMetric>("height");
  const [grow, setGrow] = useState(false);
  const youLabel = profile.name
    ? `${c.you} (${profile.name.split(" ")[0]})`
    : c.you;

  // Re-run the grow animation whenever the view changes.
  useEffect(() => {
    setGrow(false);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setGrow(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [metric]);

  const rows = useMemo(() => {
    const list: Row[] = [
      {
        key: "me",
        name: youLabel,
        image: null,
        value: me[metric],
        color: "#176B3A",
        me: true,
      },
    ];
    for (const a of animals) {
      const v = a[metric];
      if (v != null)
        list.push({
          key: a.code,
          name: a.name,
          image: a.image,
          value: v,
          color: a.color,
          me: false,
        });
    }
    return list.sort((a, b) => b.value - a.value);
  }, [me, metric, animals, youLabel]);
  const max = Math.max(...rows.map((r) => r.value));

  // Fun facts computed from the visitor's own numbers.
  const facts = useMemo(() => {
    const out: string[] = [];
    const heaviest = [...animals].sort((a, b) => b.weight - a.weight)[0];
    const tallest = [...animals]
      .filter((a) => a.height)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    const fastest = [...animals].sort((a, b) => b.speed - a.speed)[0];
    if (heaviest)
      out.push(
        c.factHeavy(
          heaviest.name,
          Math.max(1, Math.round(heaviest.weight / me.weight)),
        ),
      );
    if (tallest?.height)
      out.push(
        c.factTall(tallest.name, (tallest.height / me.height).toFixed(1)),
      );
    if (fastest)
      out.push(c.factFast(fastest.name, (fastest.speed / me.speed).toFixed(1)));
    const withHeight = animals.filter((a) => a.height != null);
    out.push(
      c.factTaller(
        withHeight.filter((a) => (a.height ?? 0) < me.height).length,
        withHeight.length,
      ),
    );
    return out;
  }, [me, animals, c]);

  const fmt = (v: number) =>
    v < 10
      ? v.toLocaleString("en", { maximumFractionDigits: 1 })
      : Math.round(v).toLocaleString("en");

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* You */}
      <div className="card h-fit min-w-0 space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Face
            row={rows.find((r) => r.me)!}
            avatar={profile.avatar}
            size="h-14 w-14"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
              {c.whoAreYou}
            </p>
            <p className="font-display text-lg font-bold text-forest">
              {youLabel}
            </p>
          </div>
        </div>
        {(["height", "weight", "speed"] as CompareMetric[]).map((m) => (
          <label key={m} className="block">
            <span className="flex items-center justify-between text-sm font-bold text-forest">
              {c.metrics[m]}
              <span className="rounded-full bg-light-green px-2.5 py-0.5 font-display text-primary">
                {me[m]} {UNIT[m]}
              </span>
            </span>
            <input
              type="range"
              min={LIMIT[m][0]}
              max={LIMIT[m][1]}
              value={me[m]}
              onChange={(e) =>
                setMe((p) => ({ ...p, [m]: Number(e.target.value) }))
              }
              className="mt-2 w-full accent-[#176B3A]"
            />
          </label>
        ))}
      </div>

      {/* Comparison */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["height", Ruler],
              ["weight", Weight],
              ["speed", Gauge],
            ] as const
          ).map(([m, Icon]) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                metric === m
                  ? "bg-primary text-white shadow-soft"
                  : "bg-white text-forest ring-1 ring-black/10 hover:ring-primary",
              )}
            >
              <Icon size={16} /> {c.metrics[m]}
            </button>
          ))}
        </div>

        {metric === "height" && (
          // Side-by-side line-up for height (tablet/desktop), each face on top of its bar.
          <div className="card hidden overflow-x-auto p-5 pt-10 sm:block">
            <div className="flex h-80 min-w-[620px] items-end gap-2 border-b-2 border-forest/20">
              {rows.map((r, i) => (
                <div
                  key={r.key}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div
                    className={cn(
                      "relative flex w-full flex-col items-center rounded-t-2xl transition-[height] duration-700 ease-out",
                      r.me && "ring-4 ring-leaf",
                    )}
                    style={{
                      height: grow
                        ? `max(3.25rem, ${(r.value / max) * 82}%)`
                        : "0%",
                      background: `${r.color}${r.me ? "" : "cc"}`,
                      transitionDelay: `${i * 50}ms`,
                    }}
                  >
                    <span className="-mt-6">
                      <Face row={r} avatar={profile.avatar} size="h-11 w-11" />
                    </span>
                    <span className="mt-1 text-[11px] font-extrabold text-white drop-shadow">
                      {fmt(r.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex min-w-[620px] gap-2">
              {rows.map((r) => (
                <span
                  key={r.key}
                  className={cn(
                    "flex-1 truncate text-center text-[11px] font-bold",
                    r.me ? "text-primary" : "text-ink/60",
                  )}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <div
          className={cn(
            "card space-y-2.5 p-4 sm:p-5",
            metric === "height" && "sm:hidden",
          )}
        >
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center gap-3">
              <Face
                row={r}
                avatar={profile.avatar}
                size="h-9 w-9 flex-shrink-0"
              />
              <span
                className={cn(
                  "w-20 truncate text-sm font-bold sm:w-28",
                  r.me ? "text-primary" : "text-forest",
                )}
              >
                {r.name}
              </span>
              <div className="h-6 flex-1 overflow-hidden rounded-full bg-cream">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    r.me && "ring-2 ring-leaf",
                  )}
                  style={{
                    width: grow
                      ? `${Math.max(1.5, (metric === "weight" ? Math.sqrt(r.value / max) : r.value / max) * 100)}%`
                      : "0%",
                    background: r.color,
                    transitionDelay: `${i * 50}ms`,
                  }}
                />
              </div>
              <span className="w-[4.5rem] text-right text-xs font-bold tabular-nums text-ink/70 sm:w-24 sm:text-sm">
                {fmt(r.value)} {UNIT[metric]}
              </span>
            </div>
          ))}
          {metric === "weight" && (
            <p className="pt-1 text-[11px] text-ink/45">{c.scaleNote}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {facts.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-3xl bg-gradient-to-br from-light-green to-cream p-4 ring-1 ring-primary/10"
            >
              <Sparkles
                size={18}
                className="mt-0.5 flex-shrink-0 text-primary"
              />
              <p className="text-sm font-semibold text-forest">{f}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
