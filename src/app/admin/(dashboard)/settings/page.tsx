import { createClient } from "@/lib/supabase/server";
import { Settings, Building2, Palette, Satellite } from "lucide-react";
import { updateZooProfile, updateMapCalibration, updateBranding } from "./actions";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const [{ data: profileSetting }, { data: calSetting }, { data: brandingSetting }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "zoo_profile").maybeSingle(),
    supabase.from("app_settings").select("value").eq("key", "map_calibration").maybeSingle(),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
  ]);
  const profile = (profileSetting?.value ?? {}) as any;
  const cal = (calSetting?.value ?? {}) as any;
  const branding = (brandingSetting?.value ?? {}) as any;
  const { t } = getI18n();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <AdminPageHeader icon={Settings} title={t.admin.settingsPage.title} subtitle={t.admin.settingsPage.subtitle} />
      <form action={updateZooProfile} className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest"><Building2 size={18} className="text-primary" /> Zoo Profile</h2>
        <Field label="Zoo Name" name="name" defaultValue={profile.name} />
        <Field label="Tagline" name="tagline" defaultValue={profile.tagline} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Opening Time" name="opening_time" defaultValue={profile.opening_time} type="time" />
          <Field label="Closing Time" name="closing_time" defaultValue={profile.closing_time} type="time" />
        </div>
        <Field label="Address (English)" name="address" defaultValue={profile.address} />
        <Field label="Address (ខ្មែរ)" name="address_km" defaultValue={profile.address_km} />
        <Field label="Phone" name="phone" defaultValue={profile.phone} />
        <button className="btn-primary">{t.admin.save}</button>
      </form>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest"><Palette size={18} className="text-primary" /> Branding — Photo / Video / Map</h2>
        <p className="mt-1 text-sm text-ink/60">
          Shown on the visitor, staff, and admin login screens (desktop: full side panel; mobile: a
          short banner). Paste public URLs — e.g. upload via any Supabase Storage bucket and paste
          its public URL here. A video plays muted and loops forever; the photo is shown while it
          loads. Leave both blank to keep the built-in animated scene.
        </p>
        <form action={updateBranding} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Video URL (MP4 / WebM)</span>
            <input
              name="login_hero_video_url"
              defaultValue={branding.login_hero_video_url ?? ""}
              placeholder="https://your-project.supabase.co/storage/v1/object/public/.../login.mp4"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Photo URL</span>
            <input
              name="login_hero_image_url"
              defaultValue={branding.login_hero_image_url ?? ""}
              placeholder="https://your-project.supabase.co/storage/v1/object/public/..."
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Map Image URL (optional)</span>
            <span className="block text-xs text-ink/50">
              A real map of your zoo (4:3, e.g. uploaded to the zoo-maps bucket). Leave blank to use the built-in illustrated map.
            </span>
            <input
              name="map_image_url"
              defaultValue={branding.map_image_url ?? ""}
              placeholder="https://your-project.supabase.co/storage/v1/object/public/zoo-maps/map.png"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
          </label>
          <button className="btn-primary">{t.admin.save}</button>
        </form>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest"><Satellite size={18} className="text-primary" /> Map GPS Calibration</h2>
        <p className="mt-1 text-sm text-ink/60">
          Lets visitors&apos; real GPS suggest their position on the Friends-on-the-Map feature (they
          still tap to confirm/adjust the exact spot — see README). Only useful for outdoor or
          open-sky venues; GPS is unreliable indoors. Record the real-world coordinates of your map
          image&apos;s top-left and bottom-right corners — use a phone&apos;s Maps app standing at
          each corner, or a satellite map, to read these off.
        </p>
        <form action={updateMapCalibration} className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Top-left corner of the map (North-West)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" name="nw_lat" defaultValue={cal.nwLat} type="number" step="any" />
              <Field label="Longitude" name="nw_lng" defaultValue={cal.nwLng} type="number" step="any" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Bottom-right corner of the map (South-East)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" name="se_lat" defaultValue={cal.seLat} type="number" step="any" />
              <Field label="Longitude" name="se_lng" defaultValue={cal.seLng} type="number" step="any" />
            </div>
          </div>
          <button className="btn-primary">{t.admin.save}</button>
          {(!cal.nwLat || !cal.seLat) && (
            <p className="text-xs text-ink/40">
              Not set yet — until this is filled in, visitors will only be able to tap their location
              on the map manually (which always works, indoors or out).
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", step }: any) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        step={step}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}
