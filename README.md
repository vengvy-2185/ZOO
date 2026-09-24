# 🦁 Green Wild Zoo

Discover • Learn • Explore • Protect

A real, database-backed Zoo Visitor Experience & Management System: visitor
website, staff QR/ticket scanner, and admin dashboard, all sharing one
Supabase PostgreSQL database.

## What's real vs. what's a starting point

This is a working codebase with real Supabase queries throughout — nothing
is hardcoded or mocked. To be upfront about scope:

- **Fully implemented, end to end:** database schema/RLS/functions/storage,
  homepage, animal directory + search, full animal profile (biography,
  automatically-calculated age & birthday, family tree, timeline, gallery),
  digital storybook reader, multi-language audio player, custom interactive
  zoo map + "find this animal", QR generation & scan logging, the full
  ticket → checkout → digital ticket (with real QR) flow, staff camera QR
  scanner + check-in, and an admin dashboard with live stats and CRUD for
  Animals (list/add/edit) plus data-backed views for every other section
  listed in the spec (categories, species, zones, habitats, enclosures,
  tickets, bookings, visitors, birthdays, storybooks, audio, QR, a
  drag-and-drop map editor, reports, settings).
- **Scaffolded, ready to extend:** create/edit forms for sections beyond
  Animals (categories, species, zones, etc.) currently render real data but
  not yet their own forms — copy the pattern in
  `src/app/admin/(dashboard)/animals/new/` (a Server Action that inserts
  through the user's own Supabase session, so RLS — not app code — is what
  authorizes the write). Payment and text-to-speech are wired as clean,
  documented integration points (see below) rather than connected to a
  specific paid vendor, since that requires your own credentials.

## 1. Create your Supabase project tables

You said you already have a Supabase project. In the Supabase dashboard →
SQL Editor, run these files **in order** (or `supabase db push` if you use
the CLI with this repo's `supabase/migrations` folder):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_storage.sql`
5. `supabase/migrations/0005_auth_trigger.sql`
6. `supabase/migrations/0006_map_groups.sql` (Friends-on-the-Map — also
   enables Realtime for one table; if that line errors on your project,
   enable Realtime for `map_group_members` manually via Database →
   Replication instead)
7. `supabase/migrations/0007_fix_auth_role_recursion.sql` (required — fixes
   "stack depth limit exceeded" when reading animals)
8. `supabase/migrations/0008_khmer_content_and_category_images.sql` (Khmer
   `*_km` columns + category photos)
9. `supabase/seed.sql` (sample animals, zones, tickets, etc. — safe to skip
   or edit first; run it only once)
10. `supabase/seed_content_km.sql` (real photos for every sample animal and
    category, plus Khmer text for all of them — safe to re-run)

## Languages (English / ខ្មែរ)

Every page has an **EN | ខ្មែរ** switch (header, mobile menu, footer, login
screens, admin sidebar). UI text lives in `src/lib/i18n/dictionaries.ts`;
database content uses a `*_km` column next to each English one (e.g.
`biography` / `biography_km`) and falls back to English when the Khmer field
is empty. Admin forms show English and Khmer inputs side by side.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your project's values from
Supabase → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only — never exposed to the browser
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Create your first admin & staff accounts

Supabase Auth stores users in `auth.users`; this app's `profiles` table
(role: admin/staff/visitor) drives access. A database trigger
(`0005_auth_trigger.sql`) automatically creates a `profiles` row with
**role='visitor'** for every new user — whether they sign up with email or
Google. Signing in with Google never grants admin/staff access by itself;
you always promote an account manually:

```sql
insert into profiles (id, role, full_name)
values ('<their auth.users id>', 'admin', 'Zoo Admin')
on conflict (id) do update set role = 'admin';
```

Do the same with `'staff'` for scanner accounts. Find a user's id under
Supabase → Authentication → Users after they've signed in once.

## 3b. Enable Google & Facebook Sign-In (optional but supported everywhere)

Every login screen — visitor (`/account/login`), staff (`/staff/login`),
and admin (`/admin/login`) — has "Continue with Google" and "Continue with
Facebook" buttons, side by side. To turn them on:

**Google:**
1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
   Add this Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase → Authentication → Providers → Google, paste the Client ID
   and Client Secret, and enable the provider.

**Facebook:**
1. In Meta for Developers, create an app → add the "Facebook Login" product.
   Add this Valid OAuth Redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase → Authentication → Providers → Facebook, paste the App ID
   and App Secret, and enable the provider.

**Both:** in Supabase → Authentication → URL Configuration, add your site's
`/auth/callback` route (e.g. `http://localhost:3000/auth/callback` for
local dev, plus your production URL) to Redirect URLs.

That's it — `src/app/auth/callback/route.ts` handles the exchange for
either provider, and the same three login pages send people back to the
right place afterward (`/account`, `/staff/scanner`, or `/admin`).

## Login pages

All three login screens share one split layout
(`src/components/visitor/AuthSplitLayout.tsx`): a photo/video-style panel
on the left (a short banner on mobile, not just hidden), and the form on
the right. Out of the box the panel is a self-contained animated scene (no
external photo needed); set a real photo for it in Admin → Settings →
Branding → Login Page Photo. "Forgot password?" on every login form sends
a real Supabase recovery email, landing on `/account/reset-password` to
set a new one.

## 4. Install & run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the visitor site, `/staff/login` for the
scanner, and `/admin/login` for the dashboard.

## 5. Generate full TypeScript types (optional but recommended)

`src/types/database.ts` currently ships as a permissive placeholder so the
app compiles without a linked project. Once linked:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

## Integration points left open on purpose

- **Payments** — `src/app/api/checkout/route.ts` has a single clearly
  marked `chargePayment()` function. Without `PAYMENT_PROVIDER_SECRET_KEY`
  set, checkout completes as "paid" automatically so the rest of the
  ticketing flow (QR ticket, staff check-in) is fully testable. Wire your
  real provider (Stripe, PayPal, ABA PayWay, etc.) there.
- **Text-to-speech** — `audio_guides.audio_url` is nullable; upload real
  recordings via Supabase Storage (`animal-audio` bucket) from Admin →
  Audio, or wire a TTS provider using `TTS_PROVIDER_API_KEY`.

## Three separate dashboards, one login system

- **Visitor account** (`/account`, behind `/account/login`) — sign in with
  email/password or Google. Shows their own tickets, Animal Quest progress,
  discovered animals, and achievements. Anyone can create one.
- **Staff scanner** (`/staff/scanner`, behind `/staff/login`) — sign in with
  email/password or Google, but only accounts with `profiles.role = 'staff'`
  or `'admin'` get past the login (enforced server-side in
  `src/app/staff/(protected)/layout.tsx`, not just at login time — this
  matters because Google sign-in skips the old password-form role check).
- **Admin dashboard** (`/admin`, behind `/admin/login`) — same pattern,
  requires `profiles.role = 'admin'`, enforced in
  `src/app/admin/(dashboard)/layout.tsx`.

Signing in with Google **never** grants staff/admin access by itself — see
"Create your first admin & staff accounts" below.

## Project structure

## Friends on the Map ("Meet Up")

On `/map`, anyone can tap **Start a Group** to get a 6-character code, share
it with friends/family, and everyone who joins can see each other's pin —
live, via Supabase Realtime — so nobody gets separated in the zoo. No
account required; it works for anonymous visitors.

- **How it works:** a group + its members live in `map_groups` /
  `map_group_members` (migration `0006_map_groups.sql`). Joining, creating,
  and updating your position all go through server-only API routes
  (`src/app/api/map-groups/*`) using the service-role key — the browser's
  anon key never writes to these tables directly.
- **Setting your position:** two ways —
  - **Tap the map** (always works, indoors or out): tap "📍 Update My
    Location", then tap anywhere on the map. This is the reliable default,
    since the map is a stylized illustration rather than a geo-referenced
    satellite view, and raw phone GPS (typically ±5–20m, worse indoors) can
    easily be a larger error than a small venue.
  - **"📶 Use My GPS"** (appears once an admin sets up calibration below):
    reads the phone's real GPS, converts it to a map position, and drops a
    *suggested* pin with a dashed accuracy circle — the person still has to
    tap to confirm or nudge it to the exact spot. GPS is a starting point
    here, never the final authority, which is the right tradeoff for a
    small venue where raw GPS error can rival the whole map's size.
  - **Calibrating GPS** (optional, Admin → Settings → Map GPS Calibration):
    record the real-world latitude/longitude of the map image's top-left
    and bottom-right corners once (read them off a phone's Maps app
    standing at each corner, or a satellite map). `src/lib/utils/geoCalibration.ts`
    does the lat/lng → map-% conversion and turns GPS accuracy (meters)
    into a correctly-sized circle. This only helps for outdoor/open-sky
    venues — GPS doesn't work reliably indoors, which is exactly why
    tapping stays the primary, always-available method.
- **Known privacy tradeoff (read before using this for anything sensitive):**
  the `map_group_members` table has a public SELECT policy, because
  Supabase Realtime's live delivery is gated by that same policy and there's
  no login involved to scope it further. This means anyone with your
  project's anon key could query every active group's members directly,
  not just their own group's. Groups auto-expire after 12 hours and store
  no real identity (just a typed display name + emoji), which keeps the
  blast radius small — but if this needs to be genuinely private, switch to
  Supabase's newer Realtime Authorization (per-topic tokens) instead of
  `postgres_changes`, and remove the public policy.

## Project structure

```
supabase/migrations/   Database schema, functions, RLS, storage buckets
supabase/seed.sql       Sample data (10 animals, 4 zones, tickets, etc.)
src/lib/supabase/       Browser / server / service-role Supabase clients
src/types/               Domain TypeScript types
src/components/visitor/  AnimalCard, StorybookReader, AudioPlayer, ZooMap...
src/components/admin/    AdminSidebar
src/app/                 Next.js App Router pages (visitor, staff, admin)
src/app/api/             Route handlers (checkout, ticket validation/check-in)
```

## Security notes

- RLS is enabled on every table; the browser only ever holds the anon key.
- `SUPABASE_SERVICE_ROLE_KEY` is read only inside `createServiceRoleClient()`
  in `src/lib/supabase/server.ts`, which throws if ever imported client-side,
  and is used only for the few operations that must bypass RLS by design
  (QR scan-count logging, checkout, ticket validation/check-in — all behind
  server-only routes with their own auth checks where relevant).
- `middleware.ts` gates `/admin/*` and `/staff/*` at the edge; each layout
  additionally checks `profiles.role` server-side before rendering.
