import Link from "next/link";
import { Radio, Eye, Heart, MessageCircle, Trash2, PlayCircle, ShieldAlert } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { canBroadcast, onAir, recentLives } from "@/lib/server/live";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { GoLiveForm } from "@/components/live/GoLiveForm";
import { ActionButton } from "@/components/staff/ActionButton";
import { removeLive } from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Go live", "ផ្សាយផ្ទាល់");

/** Staff with the media permission: go live from the phone, and see past lives. */
export default async function StaffLivePage({ searchParams }: { searchParams: { ended?: string } }) {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const { locale } = getI18n();
  const km = locale === "km";
  const allowed = canBroadcast(access);
  const lives = await recentLives(40);
  const ended = searchParams.ended ? lives.find((l) => l.id === searchParams.ended) : undefined;
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const mins = (a: string, b: string | null) => Math.max(1, Math.round(((b ? Date.parse(b) : Date.now()) - Date.parse(a)) / 60000));

  return (
    <StaffShell title={km ? "ផ្សាយផ្ទាល់" : "Go live"} subtitle={km ? "ផ្សាយផ្ទាល់ពីទូរស័ព្ទ ឲ្យភ្ញៀវមើលនៅលើ website ជាមួយបេះដូង និងមតិយោបល់។" : "Film live from your phone; visitors watch on the website with hearts and comments."}>
      {ended && (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <span className="text-3xl">🎉</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold text-forest">{km ? "ការផ្សាយបានបញ្ចប់" : "Your live has ended"}</p>
            <p className="text-sm text-ink/60">{ended.title}</p>
          </div>
          <Stat icon={<Eye size={16} />} v={ended.peak_viewers} l={km ? "អ្នកមើលច្រើនបំផុត" : "peak viewers"} />
          <Stat icon={<Heart size={16} />} v={ended.likes} l={km ? "បេះដូង" : "hearts"} />
          <Stat icon={<MessageCircle size={16} />} v={ended.comments} l={km ? "មតិ" : "comments"} />
        </div>
      )}

      {allowed ? (
        <GoLiveForm km={km} />
      ) : (
        <p className="card flex items-center gap-3 p-5 text-sm font-semibold text-ink/70">
          <ShieldAlert size={20} className="text-amber-500" /> {km ? "ការផ្សាយផ្ទាល់ត្រូវការសិទ្ធិ «មេឌៀ»។ សូមសុំ Admin ឲ្យបើកសិទ្ធិនេះក្នុងតួនាទីរបស់អ្នក។" : "Going live needs the “Media” permission. Ask an admin to add it to your position."}
        </p>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{km ? "ការផ្សាយថ្មីៗ" : "Recent lives"}</h2>
        {lives.length === 0 && <p className="text-sm text-ink/50">{km ? "មិនទាន់មានទេ" : "None yet"}</p>}
        <ul className="divide-y divide-black/5">
          {lives.map((l) => {
            const on = onAir(l);
            const mineLive = l.status === "live" && l.started_by === userId;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${on ? "bg-red-600 text-white" : "bg-slate-100 text-ink/40"}`}><Radio size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-forest">{l.title}</p>
                  <p className="text-xs text-ink/50">
                    {when(l.started_at)} · {mins(l.started_at, l.ended_at ?? (on ? null : l.alive_at))} {km ? "នាទី" : "min"}
                    {l.place ? ` · ${l.place}` : ""}
                  </p>
                </div>
                <span className="flex gap-3 text-xs font-bold text-ink/55">
                  <span className="flex items-center gap-1"><Eye size={13} /> {l.peak_viewers}</span>
                  <span className="flex items-center gap-1"><Heart size={13} /> {l.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} /> {l.comments}</span>
                </span>
                {mineLive && (
                  <Link href={`/staff/live/${l.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white">
                    <PlayCircle size={14} /> {km ? "បន្តផ្សាយ" : "Resume"}
                  </Link>
                )}
                {on && !mineLive && (
                  <Link href={`/live/${l.id}`} className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-extrabold text-[#1D4ED8]">{km ? "មើល" : "Watch"}</Link>
                )}
                {access.admin && !on && (
                  <ActionButton action={removeLive.bind(null, l.id)} label={km ? "លុប" : "Delete"} icon={<Trash2 size={14} />} confirm={km ? "លុបការផ្សាយនេះពីបញ្ជី?" : "Remove this live from the list?"} className="px-2 py-1.5 text-red-500 hover:bg-red-50" />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </StaffShell>
  );
}

function Stat({ icon, v, l }: { icon: React.ReactNode; v: number; l: string }) {
  return (
    <span className="rounded-2xl bg-cream px-4 py-2 text-center">
      <span className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-forest">{icon} {v}</span>
      <span className="text-[11px] font-bold text-ink/50">{l}</span>
    </span>
  );
}
