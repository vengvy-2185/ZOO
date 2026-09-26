import { Heart, Trophy } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { KudosForm, type Colleague } from "@/components/staff/KudosForm";
import { BADGES, type Badge } from "@/lib/staff-extras";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Thanks", "ពាក្យអរគុណ");

/** Say thank you to a colleague with a badge; everyone sees the team's thanks. */
export default async function KudosPage() {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const monthStart = `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date()).slice(0, 7)}-01T00:00:00+07:00`;
  const [{ data: staff }, { data: feed }, { data: mine }, { data: month }] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, full_name_km, position:staff_positions(name, name_km)").eq("status", "active").order("full_name"),
    db.from("staff_kudos").select("*").order("created_at", { ascending: false }).limit(30),
    db.from("staff_kudos").select("badge").eq("to_user", userId),
    db.from("staff_kudos").select("to_user").gte("created_at", monthStart),
  ]);
  const ids = (staff ?? []).map((s: any) => s.user_id);
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, avatar_url").in("id", ids) : { data: [] as any[] };
  const avatar = new Map((profiles ?? []).map((p: any) => [p.id, p.avatar_url]));
  const name = (id: string) => {
    const s: any = (staff ?? []).find((x: any) => x.user_id === id);
    return s ? (km && s.full_name_km) || s.full_name : km ? "អ្នកគ្រប់គ្រង" : "Admin";
  };
  const colleagues: Colleague[] = (staff ?? [])
    .filter((s: any) => s.user_id !== userId)
    .map((s: any) => ({ id: s.user_id, name: (km && s.full_name_km) || s.full_name, avatar: avatar.get(s.user_id) ?? null, position: (km && s.position?.name_km) || s.position?.name || "" }));
  const myCount = (Object.keys(BADGES) as Badge[]).map((b) => ({ b, n: (mine ?? []).filter((m: any) => m.badge === b).length }));
  const myTotal = (mine ?? []).length;
  // most thanked this month
  const tally = new Map<string, number>();
  for (const r of month ?? []) tally.set(r.to_user, (tally.get(r.to_user) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const ago = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "ពាក្យអរគុណ", sub: "អរគុណមិត្តរួមការងារដែលបានជួយ ឬធ្វើការល្អ។ ក្រុមទាំងមូលមើលឃើញ។", send: "ផ្ញើពាក្យអរគុណ", mine: "ផ្លាកសញ្ញារបស់ខ្ញុំ", total: "ពាក្យអរគុណសរុប", top: "អ្នកទទួលច្រើនជាងគេខែនេះ", feed: "ពាក្យអរគុណថ្មីៗ", none: "មិនទាន់មានទេ។ ចាប់ផ្តើមអរគុណមិត្តម្នាក់!", thanks: "អរគុណ" }
    : { title: "Thanks", sub: "Thank a colleague who helped or did great work. The whole team sees it.", send: "Send thanks", mine: "My badges", total: "thanks received", top: "Most thanked this month", feed: "Latest thanks", none: "Nothing yet. Be the first to thank someone!", thanks: "thanked" };
  const medal = ["from-amber-300 to-amber-500", "from-slate-200 to-slate-400", "from-orange-300 to-orange-500"];

  return (
    <StaffShell title={L.title} subtitle={L.sub} hero={<p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold ring-1 ring-white/20"><Heart size={15} className="fill-pink-300 text-pink-300" /> {myTotal} {L.total}</p>}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <section className="card p-5 md:p-6">
            <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.send}</h2>
            <KudosForm km={km} colleagues={colleagues} />
          </section>
        </div>

        <div className="space-y-5">
          {/* my badges */}
          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{L.mine}</h2>
            <div className="grid grid-cols-5 gap-2">
              {myCount.map(({ b, n }, i) => {
                const B = BADGES[b];
                return (
                  <div key={b} className="flex animate-[gwzPop_.45s_ease-out_both] flex-col items-center gap-1 text-center" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft ${n ? "" : "opacity-30 grayscale"}`} style={{ background: `linear-gradient(135deg, ${B.from}, ${B.to})` }}>
                      <B.Icon size={24} />
                      {n > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-forest shadow ring-1 ring-black/5">{n}</span>}
                    </span>
                    <span className="text-[10px] font-bold leading-tight text-ink/60 sm:text-[11px]">{km ? B.km : B.en}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* top of the month */}
          {top.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Trophy size={19} className="text-amber-500" /> {L.top}</h2>
              <ol className="space-y-2">
                {top.map(([id, n], i) => (
                  <li key={id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2 pr-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br font-display font-extrabold text-white shadow-sm ${medal[i]}`}>{i + 1}</span>
                    {avatar.get(id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar.get(id)} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] font-bold text-[#1D4ED8]">{name(id).slice(0, 1)}</span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-bold text-forest">{name(id)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-extrabold text-pink-600"><Heart size={12} className="fill-pink-500" /> {n}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* team feed */}
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{L.feed}</h2>
            <div className="space-y-2">
              {(feed ?? []).length === 0 && <p className="card p-6 text-center text-sm text-ink/55">{L.none}</p>}
              {(feed ?? []).map((k: any, i: number) => {
                const B = BADGES[k.badge as Badge] ?? BADGES.helpful;
                return (
                  <div key={k.id} className={`card flex animate-[gwzPop_.4s_ease-out_both] items-start gap-3 p-3.5 ${k.to_user === userId ? "ring-2 ring-pink-200" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${B.from}, ${B.to})` }}><B.Icon size={18} /></span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-ink/70">
                        <b className="text-forest">{name(k.from_user)}</b> {L.thanks} <b className="text-forest">{name(k.to_user)}</b> · <span className="font-bold" style={{ color: B.to }}>{km ? B.km : B.en}</span>
                      </p>
                      {k.message && <p className="mt-0.5 rounded-xl bg-slate-50 px-3 py-1.5 text-ink/70">“{k.message}”</p>}
                      <p className="mt-0.5 text-[11px] text-ink/40">{ago(k.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </StaffShell>
  );
}
