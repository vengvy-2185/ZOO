import { createClient } from "@/lib/supabase/server";
import { Settings, Building2, Palette, Satellite, Share2, Megaphone } from "lucide-react";
import { updateZooProfile, updateMapCalibration, updateBranding, updateSiteContact } from "./actions";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const [{ data: profileSetting }, { data: calSetting }, { data: brandingSetting }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "zoo_profile").maybeSingle(),
    supabase.from("app_settings").select("value").eq("key", "map_calibration").maybeSingle(),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
  ]);
  const { data: contactSetting } = await supabase.from("app_settings").select("value").eq("key", "site_contact").maybeSingle();
  const c = (contactSetting?.value ?? {}) as any;
  const profile = (profileSetting?.value ?? {}) as any;
  const cal = (calSetting?.value ?? {}) as any;
  const branding = (brandingSetting?.value ?? {}) as any;
  const { t, locale } = getI18n();
  const km = locale === "km";
  const inp = "mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary";
  const F = ({ label, name, value, ph, type = "text" }: { label: string; name: string; value?: string; ph?: string; type?: string }) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} placeholder={ph} className={inp} />
    </label>
  );

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

      <form action={updateSiteContact} className="card mt-6 space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest"><Share2 size={18} className="text-primary" /> {km ? "ទំនាក់ទំនង និងបណ្តាញសង្គម" : "Contact and social links"}</h2>
        <p className="-mt-2 text-xs text-ink/50">{km ? "បង្ហាញនៅខាងក្រោមគេហទំព័រ (footer)។ ទុកទទេ = មិនបង្ហាញរូបនោះទេ។" : "Shown in the website footer. Leave empty to hide that icon."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Facebook" name="facebook" value={c.facebook} ph="https://facebook.com/greenwildzoo" />
          <F label="Instagram" name="instagram" value={c.instagram} ph="https://instagram.com/…" />
          <F label="YouTube" name="youtube" value={c.youtube} ph="https://youtube.com/@…" />
          <F label="TikTok" name="tiktok" value={c.tiktok} ph="https://tiktok.com/@…" />
          <F label="Telegram" name="telegram" value={c.telegram} ph="https://t.me/…" />
          <F label={km ? "អ៊ីមែល" : "Email"} name="email" value={c.email} ph="hello@greenwildzoo.com" type="email" />
          <F label={km ? "លេខទូរស័ព្ទទី ២" : "Second phone"} name="phone2" value={c.phone2} ph="+855 …" />
          <F label={km ? "Link ផែនទី Google" : "Google Maps link"} name="map_link" value={c.map_link} ph="https://maps.google.com/…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="font-medium">{km ? "អំពីសួនសត្វ (EN)" : "About text (English)"}</span><textarea name="about_en" rows={3} defaultValue={c.about_en ?? ""} className={inp} /></label>
          <label className="block text-sm"><span className="font-medium">{km ? "អំពីសួនសត្វ (ខ្មែរ)" : "About text (Khmer)"}</span><textarea name="about_km" rows={3} defaultValue={c.about_km ?? ""} className={inp} /></label>
        </div>

        <div className="rounded-2xl bg-cream/60 p-4">
          <h3 className="flex items-center gap-2 font-display font-bold text-forest"><Megaphone size={16} className="text-primary" /> {km ? "របារដំណឹងខាងលើគេហទំព័រ" : "Notice bar at the top of the website"}</h3>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" name="notice_on" defaultChecked={Boolean(c.notice_on)} className="h-4 w-4 accent-[#176B3A]" /> {km ? "បង្ហាញ" : "Show it"}</label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <F label={km ? "សារ (EN)" : "Message (English)"} name="notice_en" value={c.notice_en} ph="Open late on Saturday until 8pm!" />
            <F label={km ? "សារ (ខ្មែរ)" : "Message (Khmer)"} name="notice_km" value={c.notice_km} ph="ថ្ងៃសៅរ៍ បើកដល់ម៉ោង ៨ យប់!" />
            <F label={km ? "Link (ស្រេចចិត្ត)" : "Link (optional)"} name="notice_link" value={c.notice_link} ph="/events" />
            <label className="block text-sm">
              <span className="font-medium">{km ? "ពណ៌" : "Colour"}</span>
              <select name="notice_color" defaultValue={c.notice_color ?? "green"} className={inp}>
                <option value="green">{km ? "បៃតង" : "Green"}</option>
                <option value="amber">{km ? "លឿង" : "Yellow"}</option>
                <option value="red">{km ? "ក្រហម" : "Red"}</option>
                <option value="blue">{km ? "ខៀវ" : "Blue"}</option>
              </select>
            </label>
          </div>
        </div>
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
