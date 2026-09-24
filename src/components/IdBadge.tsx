import { LogoMark } from "@/components/visitor/Logo";
import { CARD_STYLE, type CardType } from "@/lib/members";

/**
 * A lanyard ID card (standard CR80 size, 54 x 85.6 mm, portrait) with a slot
 * punched at the top for the strap. Drawn at 280 x 444 px on screen and
 * scaled to the real size when printed.
 */
export function IdBadge({ type, name, photo, memberNo, since, site }: { type: CardType; name: string; photo: string | null; memberNo: string; since: string; site: string }) {
  const s = CARD_STYLE[type];
  const initial = [...name.trim()][0]?.toUpperCase() ?? "?";
  return (
    <div className="id-card relative h-[444px] w-[280px] flex-shrink-0 overflow-hidden rounded-[18px] bg-white shadow-lift ring-1 ring-black/10 print:shadow-none" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      {/* coloured header */}
      <div className="absolute inset-x-0 top-0 h-[168px]" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
        <svg viewBox="0 0 280 168" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M-10 150 C 60 110 120 180 200 140 S 300 120 300 120 V 180 H -10 Z" fill="#ffffff" opacity="0.1" />
          <path d="M230 20 c 30 6 44 30 40 60 c -28 -2 -46 -22 -40 -60 z" fill="#ffffff" opacity="0.12" />
          <path d="M18 60 c -20 10 -24 34 -10 52 c 16 -12 20 -32 10 -52 z" fill="#ffffff" opacity="0.1" />
        </svg>
      </div>

      {/* slot for the lanyard strap */}
      <div className="absolute left-1/2 top-[14px] h-[11px] w-[70px] -translate-x-1/2 rounded-full bg-[#EEF2F0] shadow-[inset_0_2px_3px_rgba(0,0,0,0.35)] ring-1 ring-white/60" />

      {/* zoo name */}
      <div className="absolute inset-x-0 top-[38px] flex items-center justify-center gap-2 text-white">
        <LogoMark className="h-9 w-9 drop-shadow" />
        <div className="leading-none">
          <p className="font-display text-[17px] font-extrabold tracking-wide">GREEN WILD ZOO</p>
          <p className="mt-0.5 text-[9px] font-semibold tracking-wider" style={{ color: s.ink }}>
            NATURE, ANIMALS, TOGETHER
          </p>
        </div>
      </div>

      {/* photo */}
      <div className="absolute left-1/2 top-[96px] h-[120px] w-[120px] -translate-x-1/2 overflow-hidden rounded-[28px] bg-white p-[5px] shadow-lift">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[23px] font-display text-5xl font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${s.to}, ${s.from})` }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </div>
      </div>

      {/* name and role */}
      <div className="absolute inset-x-4 top-[228px] text-center">
        <p className="line-clamp-2 font-display text-[22px] font-extrabold leading-tight text-[#0E3F24]">{name}</p>
        <span className="mt-2 inline-flex flex-col items-center rounded-2xl px-4 py-1.5 text-white shadow-soft" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
          <span className="text-[12px] font-extrabold uppercase tracking-[0.14em]">{s.en}</span>
          <span className="font-khmer text-[11px] font-semibold leading-tight" style={{ color: s.ink }}>
            {s.km}
          </span>
        </span>
      </div>

      {/* details */}
      <div className="absolute inset-x-5 bottom-[46px] grid grid-cols-2 gap-2 border-t border-dashed border-black/10 pt-2.5 text-center">
        <div>
          <p className="text-[8.5px] font-bold uppercase tracking-wider text-black/40">ID No.</p>
          <p className="font-mono text-[12px] font-extrabold text-[#0E3F24]">{memberNo}</p>
        </div>
        <div>
          <p className="text-[8.5px] font-bold uppercase tracking-wider text-black/40">Since</p>
          <p className="font-mono text-[12px] font-extrabold text-[#0E3F24]">{since}</p>
        </div>
      </div>

      {/* footer strip */}
      <div className="absolute inset-x-0 bottom-0 flex h-[34px] items-center justify-center gap-1.5 text-[10px] font-bold tracking-wider text-white" style={{ background: `linear-gradient(90deg, ${s.from}, ${s.to})` }}>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
          <path d="M12 2c5 2 8 6 8 11-5 0-9-3-8-11z M12 2c-5 2-8 6-8 11 5 0 9-3 8-11z" fill="currentColor" opacity="0.85" />
        </svg>
        {site.replace(/^https?:\/\//, "")}
      </div>
    </div>
  );
}
