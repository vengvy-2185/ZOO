"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Save, Check, Eraser } from "lucide-react";
import { SHIFT_UI, SHIFTS, type Shift } from "@/lib/roster-ui";
import { cn } from "@/lib/utils/cn";

export type GridDay = { day: string; name: string; num: number; today: boolean };
/** `with`: the other person in a cover · `outside`: a shift covered by someone not in this grid */
export type Cell = { shift: Shift; note: string | null; with?: string; outside?: Shift };
export type GridPerson = { id: string; name: string; role: string; me: boolean };
export type GridGroup = { key: string; label: string; people: GridPerson[] };

/**
 * The team schedule. Managers tap a box, pick a shift from the little menu,
 * and the change shows at once; a bar at the bottom saves all changes
 * together (or undoes them). Everyone else just reads it.
 */
export function RosterGrid({
  days,
  groups,
  cells,
  editable,
  compact,
  km,
  times,
  save,
  need,
  teamLabel,
}: {
  days: GridDay[];
  groups: GridGroup[];
  cells: Record<string, Cell>;
  editable: boolean;
  compact: boolean;
  km: boolean;
  times: Record<Shift, string>;
  save: (fd: FormData) => Promise<void>;
  /** people needed each day (morning / afternoon) for the teams shown */
  need?: { am: number; pm: number };
  /** the team shown, for the "the schedule will change" check before saving */
  teamLabel?: string;
}) {
  const router = useRouter();
  const [changes, setChanges] = useState<Record<string, Shift | "">>({});
  const [menu, setMenu] = useState<{ key: string; top: number; left: number } | null>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [asking, setAsking] = useState(false);
  const dirty = Object.keys(changes).length;

  // new data from the server replaces local edits that were saved
  useEffect(() => setChanges({}), [cells]);
  useEffect(() => {
    if (!menu) return;
    // close only when the page really moves (tapping can nudge it a few px)
    const y0 = window.scrollY;
    const onScroll = () => Math.abs(window.scrollY - y0) > 40 && setMenu(null);
    const close = () => setMenu(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const value = (k: string): Shift | undefined => (k in changes ? changes[k] || undefined : cells[k]?.shift);
  const pick = (k: string, v: Shift | "") => {
    setChanges((c) => {
      const next = { ...c };
      if ((cells[k]?.shift ?? "") === v) delete next[k];
      else next[k] = v;
      return next;
    });
    setMenu(null);
    navigator.vibrate?.(10);
  };
  const saveAll = () =>
    start(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(changes)) fd.set(`s_${k}`, v);
      await save(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });

  const counts = useMemo(() => {
    // how many people work each day (for the little totals row)
    const out: Record<string, { am: number; pm: number }> = {};
    for (const d of days) {
      out[d.day] = { am: 0, pm: 0 };
      for (const g of groups)
        for (const p of g.people) {
          const k = `${p.id}_${d.day}`;
          const v = value(k);
          if (v === "morning" || v === "full") out[d.day].am++;
          if (v === "afternoon" || v === "full") out[d.day].pm++;
          // covered by someone not shown here (another team, an admin): the shift is still done
          const o = k in changes ? undefined : cells[k]?.outside;
          if (o === "morning" || o === "full") out[d.day].am++;
          if (o === "afternoon" || o === "full") out[d.day].pm++;
        }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, groups, cells, changes]);

  const L = km
    ? { name: "ឈ្មោះ", changed: (n: number) => `បានកែ ${n} ប្រអប់`, save: "រក្សាទុក", saving: "កំពុងរក្សាទុក…", undo: "បោះបង់", saved: "បានរក្សាទុក", clear: "លុប", total: "សរុប ព្រឹក/រសៀល", none: "មិនមានបុគ្គលិកក្នុងក្រុមនេះទេ។" }
    : { name: "Name", changed: (n: number) => `${n} box${n === 1 ? "" : "es"} changed`, save: "Save", saving: "Saving…", undo: "Undo", saved: "Saved", clear: "Clear", total: "Total AM/PM", none: "No staff in this team." };
  if (!groups.some((g) => g.people.length)) return <p className="p-8 text-center text-ink/55">{L.none}</p>;

  return (
    <>
      <div className="no-scrollbar overflow-x-auto">
        <table className={cn("w-full table-fixed border-separate border-spacing-0 text-sm", compact ? "min-w-[64rem]" : "min-w-[46rem]")}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[8.5rem] bg-white px-3 py-2 text-left text-xs font-bold text-ink/45 md:w-[11rem]">{L.name}</th>
              {days.map((d) => (
                <th key={d.day} className={cn("px-1 py-2 text-center text-[11px] font-bold", d.today ? "text-[#1D4ED8]" : "text-ink/45")}>
                  <span className="block">{d.name}</span>
                  <span className={cn("mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs", d.today && "bg-[#1D4ED8] text-white")}>{d.num}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) =>
              g.people.length === 0 ? null : (
                <GroupRows key={g.key} g={g} days={days} compact={compact} editable={editable} km={km} value={value} changes={changes} cells={cells} openMenu={(key, el) => {
                  const r = el.getBoundingClientRect();
                  const w = 176;
                  setMenu({ key, top: Math.min(window.innerHeight - 250, r.bottom + 6), left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) });
                }} />
              )
            )}
            <tr>
              <td className="sticky left-0 z-10 border-t-2 border-black/5 bg-white px-3 py-2 text-[11px] font-bold text-ink/45">{L.total}</td>
              {days.map((d) => (
                <td key={d.day} className="border-t-2 border-black/5 px-1 py-2 text-center text-[11px] font-extrabold text-ink/55">
                  {(() => {
                    const short = !!need && (counts[d.day].am < need.am || counts[d.day].pm < need.pm);
                    return (
                      <span className={cn("inline-block rounded-full px-1.5 py-0.5", short && "bg-red-100 text-red-700 ring-1 ring-red-200")} title={short ? (km ? "ខ្វះមនុស្ស" : "Short of people") : undefined}>
                        <span className={short ? "" : "text-amber-600"}>{counts[d.day].am}</span>/<span className={short ? "" : "text-sky-600"}>{counts[d.day].pm}</span>
                        {short && <span className="ml-1">⚠</span>}
                      </span>
                    );
                  })()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* the little shift menu */}
      {menu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)} />
          <div className="fixed z-[71] w-44 animate-[gwzPop_.18s_ease-out_both] rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-black/10" style={{ top: menu.top, left: menu.left }}>
            {SHIFTS.map((sh) => (
              <button key={sh} type="button" onClick={() => pick(menu.key, sh)} className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold transition hover:bg-slate-50 active:scale-[.97]", value(menu.key) === sh && "bg-[#EEF2FF]")}>
                <span className={cn("h-3 w-3 rounded-full", SHIFT_UI[sh].dot)} />
                <span className="flex-1">{km ? SHIFT_UI[sh].km : SHIFT_UI[sh].en}</span>
                {sh !== "off" && <span className="text-[10px] font-semibold text-ink/40">{times[sh]}</span>}
                {value(menu.key) === sh && <Check size={14} className="text-[#1D4ED8]" />}
              </button>
            ))}
            <button type="button" onClick={() => pick(menu.key, "")} className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold text-ink/50 transition hover:bg-red-50 hover:text-red-600">
              <Eraser size={14} /> {L.clear}
            </button>
          </div>
        </>
      )}

      {/* "the schedule will change on …" before saving */}
      {asking && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setAsking(false)}>
          <div className="w-full max-w-md animate-[gwzPop_.2s_ease-out_both] rounded-3xl bg-white p-5 text-ink shadow-lift" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-extrabold text-forest">{km ? "បញ្ជាក់ការកែកាលវិភាគ" : "Confirm the schedule change"}</p>
            <p className="mt-2 text-sm text-ink/70">
              {km ? `នៅថ្ងៃខាងក្រោម នឹងមានការកែប្រែកាលវិភាគ សម្រាប់${teamLabel ?? "ក្រុម"}៖` : `The schedule of ${teamLabel ?? "the team"} will change on:`}
            </p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {[...new Set(Object.keys(changes).map((k) => k.slice(37)))].sort().map((day) => {
                const who = Object.keys(changes).filter((k) => k.slice(37) === day).map((k) => groups.flatMap((x) => x.people).find((p) => p.id === k.slice(0, 36))?.name).filter(Boolean);
                return (
                  <li key={day} className="rounded-xl bg-[#EEF2FF] px-3 py-2 text-sm">
                    <b className="text-[#1E3A8A]">{new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${day}T12:00:00Z`))}</b>
                    <span className="block text-xs text-ink/60">{who.join(", ")}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs font-semibold text-ink/50">{km ? "ក្រុមនឹងទទួលសារជូនដំណឹងក្នុងជជែកក្រុម។" : "The team gets a message in its chat."}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setAsking(false)} className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-ink/65">{km ? "ត្រឡប់" : "Back"}</button>
              <button
                type="button"
                onClick={() => {
                  setAsking(false);
                  saveAll();
                }}
                className="flex-1 rounded-2xl bg-forest py-3 text-sm font-extrabold text-white"
              >
                {km ? "បាទ/ចាស រក្សាទុក" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* save bar */}
      {editable && (dirty > 0 || saved) && (
        <div className="sticky bottom-20 z-30 mx-3 mb-3 mt-2 flex animate-[gwzPop_.25s_ease-out_both] items-center gap-2 rounded-2xl bg-forest p-2 pl-4 text-white shadow-lift md:bottom-4">
          {saved && dirty === 0 ? (
            <span className="flex flex-1 items-center gap-2 py-1.5 text-sm font-bold"><Check size={17} className="text-leaf" /> {L.saved}</span>
          ) : (
            <>
              <span className="flex-1 text-sm font-bold">{L.changed(dirty)}</span>
              <button type="button" disabled={pending} onClick={() => setChanges({})} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 active:scale-95">
                <X size={15} /> {L.undo}
              </button>
              <button type="button" disabled={pending} onClick={() => setAsking(true)} className="inline-flex items-center gap-1.5 rounded-full bg-leaf px-5 py-2 text-sm font-extrabold text-forest transition active:scale-95 disabled:opacity-80">
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {pending ? L.saving : L.save}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function GroupRows({ g, days, compact, editable, km, value, changes, cells, openMenu }: { g: GridGroup; days: GridDay[]; compact: boolean; editable: boolean; km: boolean; value: (k: string) => Shift | undefined; changes: Record<string, Shift | "">; cells: Record<string, Cell>; openMenu: (key: string, el: HTMLElement) => void }) {
  return (
    <>
      {g.label && (
        <tr>
          <td colSpan={days.length + 1} className="sticky left-0 border-t border-black/5 bg-[#EEF2FF] px-3 py-1.5 text-xs font-extrabold text-[#1E3A8A]">
            {g.label} · {g.people.length}
          </td>
        </tr>
      )}
      {g.people.map((p) => (
        <tr key={p.id}>
          <td className={cn("sticky left-0 z-10 border-t border-black/5 px-3 py-2", p.me ? "bg-[#F8FAFF]" : "bg-white")}>
            <p className="truncate font-bold text-forest">{p.name}</p>
            <p className="truncate text-[11px] text-ink/45">{p.role}</p>
          </td>
          {days.map((d) => {
            const k = `${p.id}_${d.day}`;
            const v = value(k);
            const changed = k in changes;
            const note = cells[k]?.note;
            const badge = v ? (
              <span className={cn("inline-flex w-full items-center justify-center rounded-lg py-1.5 font-extrabold ring-1", SHIFT_UI[v].cls, compact ? "px-0.5 text-[10px]" : "px-1 text-xs")}>{compact ? (km ? SHIFT_UI[v].shortKm : SHIFT_UI[v].short) : km ? SHIFT_UI[v].km : SHIFT_UI[v].en}</span>
            ) : editable ? (
              <span className="inline-flex w-full items-center justify-center rounded-lg py-1.5 text-ink/25 ring-1 ring-dashed ring-black/10"><Plus size={14} /></span>
            ) : (
              <span className="text-ink/20">·</span>
            );
            return (
              <td key={d.day} className={cn("border-t border-black/5 px-1 py-1.5 text-center align-top", d.today && "bg-[#EEF2FF]/60", p.me && "bg-[#F8FAFF]")}>
                <div className={cn("flex flex-col justify-start", compact ? "h-[2.9rem]" : "h-[3.4rem]")}>
                {editable ? (
                  <button type="button" onClick={(e) => openMenu(k, e.currentTarget)} className={cn("relative block w-full rounded-lg transition duration-150 hover:-translate-y-0.5 active:scale-90", changed && "ring-2 ring-violet-500 ring-offset-1")}>
                    {badge}
                  </button>
                ) : (
                  badge
                )}
                {note && !changed && (note === "cover" || note === "covered") && cells[k]?.with ? (
                  <span className={cn("mt-0.5 block truncate font-bold", compact ? "text-[8px]" : "text-[10px]", note === "cover" ? "text-emerald-700" : "text-violet-700")} title={cells[k]?.with}>
                    {note === "cover" ? (km ? `ជំនួស ${cells[k]!.with}` : `for ${cells[k]!.with}`) : km ? `ជំនួសដោយ ${cells[k]!.with}` : `by ${cells[k]!.with}`}
                  </span>
                ) : (
                  note && !compact && !changed && <span className="mt-0.5 block truncate text-[9px] font-bold uppercase text-ink/35">{note === "cover" ? (km ? "ជំនួស" : "cover") : note === "swap" ? (km ? "ដូរ" : "swap") : note === "leave" ? (km ? "ច្បាប់" : "leave") : ""}</span>
                )}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
