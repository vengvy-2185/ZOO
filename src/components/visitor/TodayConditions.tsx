import Link from "next/link";
import { Thermometer, Umbrella, Sun, Lightbulb, CalendarHeart, CloudSun, CloudFog, CloudRain, CloudLightning, type LucideIcon } from "lucide-react";
import { getActiveAnimals } from "@/lib/data/zoo";
import { getWeather } from "@/lib/data/conditions";
import { INVITES, dayNumber } from "@/lib/data/invites";
import { zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils/cn";

// WMO weather code → icon, colour and dictionary key
function sky(code: number): { Icon: LucideIcon; color: string; key: "clear" | "cloudy" | "fog" | "rain" | "storm" } {
  if (code === 0 || code === 1) return { Icon: Sun, color: "#F59E0B", key: "clear" };
  if (code <= 3) return { Icon: CloudSun, color: "#F59E0B", key: "cloudy" };
  if (code === 45 || code === 48) return { Icon: CloudFog, color: "#64748B", key: "fog" };
  if (code >= 95) return { Icon: CloudLightning, color: "#6366F1", key: "storm" };
  return { Icon: CloudRain, color: "#0EA5E9", key: "rain" };
}

/** Next Saturday (or today if it's already the weekend), as YYYY-MM-DD. */
function weekendDate(today: string) {
  const d = new Date(`${today}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 Sun … 6 Sat
  const add = dow === 6 || dow === 0 ? 0 : 6 - dow;
  return new Date(d.getTime() + add * 86400000).toISOString().slice(0, 10);
}

/** Live weather, a sweet daily invitation with quick date picks, and a practical tip. */
export async function TodayConditions({ className }: { className?: string }) {
  const [weather, animals] = await Promise.all([getWeather(), getActiveAnimals().catch(() => [] as any[])]);
  const { locale, t } = getI18n();
  const c = t.conditions;
  const km = locale === "km";
  const s = weather ? sky(weather.code) : null;
  const today = zooToday();
  const invite = INVITES[dayNumber(today) % INVITES.length];
  // The real photo of the animal speaking (or of today's animal for general lines).
  const withPhoto = (animals as any[]).filter((a) => a.main_image_url);
  const speaker = withPhoto.find((a) => a.animal_code === invite.animal) ?? withPhoto[dayNumber(today) % Math.max(1, withPhoto.length)];
  const dates = [
    { label: c.today, date: today },
    { label: c.tomorrow, date: zooToday(1) },
    { label: c.weekend, date: weekendDate(today) },
  ];

  const tip = !weather
    ? null
    : weather.rain >= 60 || s?.key === "storm"
      ? c.tipRain
      : weather.max >= 33 || weather.feels >= 36
        ? c.tipHot
        : weather.uv >= 8
          ? c.tipSun
          : c.tipGood;

  return (
    <section className={cn("grid gap-3 md:grid-cols-3", className)} data-reveal>
      {weather && s && (
        <div className="card flex flex-col justify-between gap-2 p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: `${s.color}1f`, color: s.color }}>
              <s.Icon size={30} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/45">{c.weather}</p>
              <p className="font-display text-3xl font-extrabold text-forest">
                {weather.temp}°C <span className="text-sm font-semibold text-ink/50">{c.sky[s.key]}</span>
              </p>
              <p className="text-xs text-ink/55">{c.feels(weather.feels)}</p>
            </div>
          </div>
          <p className="flex flex-wrap gap-x-3 text-xs text-ink/55">
            <span className="inline-flex items-center gap-1">
              <Thermometer size={12} /> {c.range(weather.min, weather.max)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Umbrella size={12} /> {c.rainChance(weather.rain)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Sun size={12} /> UV {weather.uv}
            </span>
          </p>
          <p className="text-[10px] text-ink/35">{c.source(weather.time.slice(11, 16))}</p>
        </div>
      )}

      {/* A different sweet invitation every day */}
      <div className="card relative overflow-hidden p-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <CalendarHeart size={14} /> {c.inviteTitle}
        </p>
        <div className="mt-2 flex items-start gap-3">
          {speaker && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={speaker.main_image_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-leaf" />
          )}
          <p className="text-[15px] font-semibold leading-relaxed text-forest">{km ? invite.km : invite.en}</p>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-2">
          {dates.map((d, i) => (
            <Link
              key={d.label}
              href={`/tickets?date=${d.date}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:-translate-y-0.5",
                i === 0 ? "bg-primary text-white shadow-soft" : "bg-light-green text-primary hover:bg-primary hover:text-white"
              )}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      {tip && (
        <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-br from-primary to-forest p-5 text-white shadow-lift">
          <Lightbulb size={22} className="mt-0.5 flex-shrink-0 text-accent" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-leaf">{c.tipTitle}</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed">{tip}</p>
          </div>
        </div>
      )}
    </section>
  );
}
