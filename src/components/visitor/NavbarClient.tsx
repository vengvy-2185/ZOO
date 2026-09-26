"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, LogIn, UserPlus, User, LayoutDashboard, ScanLine, ChevronRight, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import { NAV_LINKS, MORE_LINKS, MORE_GROUPS, isActivePath } from "./nav-links";

const BOTTOM_BAR = ["/", "/animals", "/map", "/tickets"];
import { FavoritesNavButton } from "./FavoritesGrid";
import { MonkeyOnVine } from "./JungleAmbience";
import { MyTicketsButton } from "./MyTickets";

export interface SearchAnimal {
  code: string;
  name: string;
  name_km: string | null;
  species: string | null;
  species_km: string | null;
  image: string | null;
}
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n/client";

export function NavbarClient({
  signedIn,
  displayName,
  avatarUrl,
  role,
  animals = [],
}: {
  signedIn: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  role: string | null;
  /** Small list of animals for instant search suggestions. */
  animals?: SearchAnimal[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);
  const router = useRouter();
  const { locale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  // Instant suggestions while typing (English or Khmer names and species).
  const q = query.trim().toLowerCase();
  const suggestions = q
    ? animals
        .filter((a) => [a.name, a.name_km, a.species, a.species_km].some((v) => v && v.toLowerCase().includes(q)))
        .slice(0, 6)
    : [];

  // Lock page scroll behind the open mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(q ? `/animals?q=${encodeURIComponent(q)}` : "/animals");
  }

  const dashboard =
    role === "admin"
      ? { href: "/admin", label: t.nav.adminDashboard, short: t.nav.admin, icon: LayoutDashboard }
      : role === "staff"
        ? { href: "/staff/scanner", label: t.nav.staffScanner, short: t.nav.scanner, icon: ScanLine }
        : null;

  return (
    <>
      {/* Climbing monkey on every page (it can be switched off with its X button). */}
      <MonkeyOnVine />
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled ? "border-black/5 bg-white/90 shadow-soft backdrop-blur-lg" : "border-transparent bg-white/75 backdrop-blur"
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 md:h-[72px] md:px-6">
          <Logo subtitle={t.nav.tagline} className="sm:flex-shrink-0" />

          {/* Desktop menu */}
          <nav className="hidden min-w-0 items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV_LINKS.map(({ href, key }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold 2xl:text-[15px] transition-colors 2xl:px-3.5",
                    active ? "text-primary" : "text-ink/65 hover:bg-light-green hover:text-primary"
                  )}
                >
                  {t.nav[key]}
                  {active && <span className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-primary" />}
                </Link>
              );
            })}
            {/* "More" — the extra pages that used to live only in the footer */}
            <div className="relative" onMouseLeave={() => setMoreOpen(false)}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                onMouseEnter={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold 2xl:text-[15px] transition-colors 2xl:px-3.5",
                  MORE_LINKS.some((l) => isActivePath(pathname, l.href)) || moreOpen ? "text-primary" : "text-ink/65 hover:bg-light-green hover:text-primary"
                )}
              >
                {t.nav.more} <ChevronDown size={15} className={cn("transition-transform", moreOpen && "rotate-180")} />
              </button>
              <div className={cn("absolute right-0 top-full z-50 pt-3 transition", moreOpen ? "visible opacity-100" : "invisible -translate-y-1 opacity-0")}>
                <div className="grid w-[min(60rem,calc(100vw-3rem))] grid-cols-4 gap-2 rounded-3xl bg-white p-3 shadow-lift ring-1 ring-black/5">
                  {MORE_GROUPS.map((g, gi) => (
                    <div key={g.key} className={cn("min-w-0 p-1", gi > 0 && "border-l border-black/5 pl-3")}>
                      <p className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{t.nav[g.key]}</p>
                      {g.links.map(({ href, key, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-2xl px-2 py-2 text-sm font-semibold transition",
                            isActivePath(pathname, href) ? "bg-light-green text-primary" : "text-ink/75 hover:bg-cream hover:text-primary"
                          )}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-light-green text-primary">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 leading-snug">{t.nav[key]}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-2">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              aria-label={t.nav.searchAnimals}
              className="flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-forest transition hover:bg-light-green"
            >
              <Search size={19} strokeWidth={2.4} />
            </button>

            <MyTicketsButton label={t.nav.myTickets} />

            <FavoritesNavButton label={t.nav.favorites} />

            <LanguageSwitcher className="hidden sm:flex" />

            {/* Desktop account buttons */}
            <div className="hidden items-center gap-2 lg:flex">
              {dashboard && (
                <Link
                  href={dashboard.href}
                  title={dashboard.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-light-green text-primary transition hover:bg-primary hover:text-white"
                >
                  <dashboard.icon size={18} />
                </Link>
              )}
              {signedIn ? (
                <Link
                  href="/account"
                  title={t.nav.myAccount}
                  className="flex items-center rounded-full border border-black/10 p-1 transition hover:border-primary"
                >
                  <Avatar url={avatarUrl} name={displayName} />
                </Link>
              ) : (
                <>
                  <Link href="/account/login" className="btn-outline whitespace-nowrap px-4 py-2">
                    {t.nav.login}
                  </Link>
                  <Link href="/account/login?mode=signup" className="btn-primary hidden whitespace-nowrap px-4 py-2 2xl:inline-flex">
                    {t.nav.signUp}
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t.nav.openMenu}
              className="flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-light-green text-forest transition hover:bg-primary hover:text-white xl:hidden"
            >
              <Menu size={21} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Search drawer (both sizes) */}
        <div className={cn("grid transition-all duration-300", searchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <form onSubmit={submitSearch} className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-4 md:px-6">
              <div className="relative flex-1">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  name="q"
                  autoFocus={searchOpen}
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.nav.searchPlaceholder}
                  className="input pl-11"
                />
              </div>
              <button className="btn-primary">{t.nav.search}</button>
            </form>
            {q && (
              <div className="mx-auto max-w-3xl px-4 pb-4 md:px-6">
                <div className="overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/5">
                  {suggestions.length === 0 ? (
                    <p className="p-4 text-sm text-ink/55">{t.extra.searchNoResults}</p>
                  ) : (
                    <ul className="divide-y divide-black/5">
                      {suggestions.map((a) => (
                        <li key={a.code}>
                          <Link href={`/animals/${a.code}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-light-green">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.image ?? ""} alt="" className="h-11 w-14 rounded-xl bg-light-green object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-forest">{(locale === "km" && a.name_km) || a.name}</span>
                              <span className="block truncate text-xs text-ink/55">{(locale === "km" && a.species_km) || a.species}</span>
                            </span>
                            <ArrowRight size={16} className="text-primary" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={`/animals?q=${encodeURIComponent(query.trim())}`} className="block bg-cream px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-light-green">
                    {t.extra.seeAllResults}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile / tablet slide-out menu */}
      <div
        className={cn("fixed inset-0 z-50 xl:hidden", menuOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={cn("absolute inset-0 bg-forest/40 backdrop-blur-sm transition-opacity duration-300", menuOpen ? "opacity-100" : "opacity-0")}
        />
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[78%] max-w-[300px] flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <Logo subtitle={null} className="scale-90 origin-left" />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label={t.nav.closeMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-forest shadow-soft"
            >
              <X size={18} />
            </button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-soft">
              <span className="text-xs font-semibold text-forest">{t.nav.language}</span>
              <LanguageSwitcher />
            </div>
            {signedIn && (
              <Link href="/account" className="mb-3 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-soft">
                <Avatar url={avatarUrl} name={displayName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-forest">{displayName ?? t.nav.myAccount}</div>
                  <div className="truncate text-[11px] text-ink/50">{t.nav.accountHint}</div>
                </div>
                <ChevronRight size={18} className="text-ink/30" />
              </Link>
            )}

            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-ink/40">{t.nav.explore}</p>
            <nav className="space-y-0.5" aria-label="Mobile">
              {NAV_LINKS.map(({ href, key, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] font-semibold transition",
                      active ? "bg-primary text-white shadow-soft" : "text-forest hover:bg-white",
                      // Phones already have these in the bottom bar.
                      BOTTOM_BAR.includes(href) && "max-md:hidden"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        active ? "bg-white/15" : "bg-light-green text-primary"
                      )}
                    >
                      <Icon size={17} strokeWidth={2.3} />
                    </span>
                    {t.nav[key]}
                    <ChevronRight size={14} className={cn("ml-auto", active ? "text-white/70" : "text-ink/25")} />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-1 space-y-1">
              {MORE_LINKS.map(({ href, key, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] font-semibold transition",
                    isActivePath(pathname, href) ? "bg-primary text-white shadow-soft" : "text-forest hover:bg-white"
                  )}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isActivePath(pathname, href) ? "bg-white/15" : "bg-light-green text-primary")}>
                    <Icon size={17} strokeWidth={2.3} />
                  </span>
                  {t.nav[key]}
                  <ChevronRight size={14} className={cn("ml-auto", isActivePath(pathname, href) ? "text-white/60" : "text-ink/25")} />
                </Link>
              ))}
            </div>

            {dashboard && (
              <>
                <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-widest text-ink/40">{t.nav.team}</p>
                <Link href={dashboard.href} className="flex items-center gap-3 rounded-2xl bg-forest px-3 py-3 font-semibold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <dashboard.icon size={18} />
                  </span>
                  {dashboard.label}
                  <ChevronRight size={16} className="ml-auto text-white/60" />
                </Link>
              </>
            )}
          </div>

          {!signedIn && (
            <div className="safe-bottom grid grid-cols-2 gap-2 border-t border-black/5 p-4">
              <Link href="/account/login" className="btn-outline">
                <LogIn size={16} /> {t.nav.login}
              </Link>
              <Link href="/account/login?mode=signup" className="btn-primary">
                <UserPlus size={16} /> {t.nav.signUp}
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Avatar({ url, name, size = "sm" }: { url: string | null; name: string | null; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 text-base" : "h-8 w-8 text-sm";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" className={cn("rounded-full object-cover", box)} />;
  }
  return (
    <span className={cn("flex items-center justify-center rounded-full bg-primary font-bold text-white", box)}>
      {name?.trim()?.[0]?.toUpperCase() ?? <User size={16} />}
    </span>
  );
}
