import { getBranding } from "@/lib/branding";
import { CinematicLoopVideo } from "./CinematicLoopVideo";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Used by all three login screens (visitor, staff, admin) so they share one
// polished look. The visual panel shows a real video/photo once an admin
// sets one (Admin → Settings → Branding), and otherwise falls back to an
// animated, self-contained scene (no external stock photo/video — nothing
// to license, nothing that can silently 404) built from the same icon set
// used throughout the app.
export async function AuthSplitLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { heroImageUrl, heroVideoUrl } = await getBranding();

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* One media layer for every screen size (so the video downloads once):
          full screen behind the form on phones, the left half on desktop. */}
      <div className="fixed inset-y-0 left-0 w-full overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary md:w-1/2">
        <HeroMedia imageUrl={heroImageUrl} videoUrl={heroVideoUrl} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 md:bg-gradient-to-t md:from-black/50 md:via-black/10 md:to-transparent" />
      </div>

      {/* Desktop caption over the left half. */}
      <div className="relative hidden md:block">
        <div className="fixed bottom-10 left-10 w-[calc(50%-5rem)] text-white">
          <p className="text-sm uppercase tracking-widest text-accent">{eyebrow}</p>
          <h2 className="mt-1 text-3xl font-bold">{title}</h2>
          <p className="mt-2 max-w-sm text-white/80">{subtitle}</p>
        </div>
      </div>

      {/* On mobile the form's own white card (the direct child div of each
          login form) is turned into frosted glass over the moving background;
          from md up it's the normal solid card on the plain right-hand panel. */}
      <div
        className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-10 md:min-h-0 md:bg-background md:px-6 md:py-0
          max-md:[&>div:last-child]:border max-md:[&>div:last-child]:border-white/50 max-md:[&>div:last-child]:bg-white/70
          max-md:[&>div:last-child]:shadow-2xl max-md:[&>div:last-child]:backdrop-blur-xl"
      >
        <div className="text-center text-white drop-shadow md:hidden">
          <p className="text-xs uppercase tracking-widest text-accent">{eyebrow}</p>
          <p className="mt-1 text-2xl font-bold">{title}</p>
        </div>
        <LanguageSwitcher className="absolute right-4 top-4 bg-white/90 shadow-soft md:bg-light-green md:shadow-none" />
        {children}
      </div>
    </div>
  );
}

// Priority: video → photo → built-in animated scene. The video loops
// forever with a slow fade-through-dark at the loop point (see CinematicLoopVideo).
// The photo (if any) doubles as the poster shown while the video loads, and
// for visitors who ask for reduced motion the video is hidden so the
// photo/animated scene underneath shows instead.
export function HeroMedia({ imageUrl, videoUrl }: { imageUrl?: string; videoUrl?: string }) {
  return (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <AnimatedScene />
      )}
      {videoUrl && <CinematicLoopVideo src={videoUrl} poster={imageUrl} />}
    </>
  );
}

function AnimatedScene() {
  return (
    <div className="absolute inset-0">
      <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-0 flex items-center justify-center gap-6 text-6xl opacity-90 md:text-7xl">
        <span className="animate-[float_5s_ease-in-out_infinite]">🦁</span>
        <span className="animate-[float_6s_ease-in-out_infinite_0.5s]">🦒</span>
        <span className="animate-[float_5.5s_ease-in-out_infinite_1s]">🦜</span>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
