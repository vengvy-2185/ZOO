import { BadgeCheck, Briefcase, CalendarDays, IdCard as IdCardIcon, Lock, Phone, UserRound } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getMembers, ensureCard } from "@/lib/server/members";
import { getSiteUrl } from "@/lib/server/site-url";
import { cardNo } from "@/lib/members";
import { getI18n } from "@/lib/i18n/server";
import { IdCard } from "@/components/IdCard";
import { StaffShell } from "@/components/staff/StaffShell";
import { PasswordForm, ProfileForm } from "@/components/staff/StaffForms";

export const dynamic = "force-dynamic";

/** Me: my details, my ID card, change photo/phone and password. */
export default async function StaffProfilePage() {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const [found] = await getMembers(userId);
  const member = found?.card ? await ensureCard(found) : found;
  const s = access.staff;
  const site = getSiteUrl();
  const L = km
    ? { title: "ព័ត៌មានរបស់ខ្ញុំ", sub: "រូបថត លេខទូរស័ព្ទ និងពាក្យសម្ងាត់ អ្នកអាចប្តូរដោយខ្លួនឯង។", details: "ព័ត៌មានការងារ", id: "លេខសម្គាល់", name: "ឈ្មោះ", pos: "តួនាទី", hired: "ចូលធ្វើការ", phone: "ទូរស័ព្ទ", lock: "ឈ្មោះ និងលេខសម្គាល់មាននៅលើកាតដែលបោះពុម្ព។ សូមសួរអ្នកគ្រប់គ្រង ប្រសិនបើត្រូវកែ។", edit: "កែព័ត៌មាន", password: "ប្តូរពាក្យសម្ងាត់", pwHint: "ដើម្បីសុវត្ថិភាព សូមវាយពាក្យសម្ងាត់បច្ចុប្បន្នជាមុនសិន។ កុំប្រាប់ពាក្យសម្ងាត់ដល់អ្នកដទៃ។", card: "កាតសម្គាល់ខ្លួន" }
    : { title: "My profile", sub: "You can change your photo, phone and password yourself.", details: "Work details", id: "Staff ID", name: "Name", pos: "Position", hired: "Started", phone: "Phone", lock: "Your name and Staff ID are printed on your card. Ask an admin if they need changing.", edit: "Edit my details", password: "Change password", pwHint: "For your safety, type your current password first. Never share your password.", card: "My ID card" };
  const hired = s ? new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${s.hired_on}T00:00:00Z`)) : "";

  return (
    <StaffShell active="profile" title={L.title} subtitle={L.sub}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          {s && (
            <section className="card p-5 md:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><BadgeCheck size={20} className="text-[#1D4ED8]" /> {L.details}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  [BadgeCheck, L.id, <span key="id" className="font-mono">{s.staff_no}</span>],
                  [UserRound, L.name, `${s.full_name}${s.full_name_km ? ` · ${s.full_name_km}` : ""}`],
                  [Briefcase, L.pos, (km && s.position?.name_km) || s.position?.name || "—"],
                  [CalendarDays, L.hired, hired],
                  [Phone, L.phone, s.phone || "—"],
                ].map(([Icon, k, v]: any) => (
                  <div key={k} className="flex items-center gap-3 rounded-2xl bg-[#F8FAFF] p-3 ring-1 ring-[#2563EB]/10">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]"><Icon size={17} /></span>
                    <span className="min-w-0">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{k}</dt>
                      <dd className="truncate text-sm font-bold text-forest">{v}</dd>
                    </span>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex items-start gap-2 text-xs text-ink/50"><Lock size={13} className="mt-0.5 flex-shrink-0" /> {L.lock}</p>
            </section>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <section className="card p-5 md:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><UserRound size={20} className="text-[#1D4ED8]" /> {L.edit}</h2>
              <ProfileForm km={km} photo={member?.avatar ?? null} phone={s?.phone ?? null} name={s?.full_name ?? member?.name ?? "S"} />
            </section>
            <section className="card p-5 md:p-6">
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-extrabold text-forest"><Lock size={20} className="text-[#1D4ED8]" /> {L.password}</h2>
              <p className="mb-4 text-xs text-ink/55">{L.pwHint}</p>
              <PasswordForm km={km} />
            </section>
          </div>
        </div>
        {s && member?.card && (
          <section className="card mx-auto p-5 lg:sticky lg:top-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><IdCardIcon size={18} className="text-[#1D4ED8]" /> {L.card}</h2>
            <IdCard
              data={{ type: member.card, name: member.name, photo: member.avatar, memberNo: cardNo(member), since: s.hired_on.slice(0, 7).replace("-", "."), site, verifyUrl: member.verifyToken ? `${site}/verify/${member.verifyToken}` : null, roleEn: member.positionEn, roleKm: member.positionKm }}
              fileName={`staff-card-${s.staff_no}`}
              labels={km ? { save: "រក្សាទុកក្នុងទូរស័ព្ទ", print: "បោះពុម្ព", flip: "ត្រឡប់", hint: "ចុចលើកាតដើម្បីមើលខាងក្រោយ" } : { save: "Save to phone", print: "Print", flip: "Flip", hint: "Tap the card to see the back" }}
              width={240}
            />
          </section>
        )}
      </div>
    </StaffShell>
  );
}
