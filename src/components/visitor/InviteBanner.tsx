import { cookies } from "next/headers";
import { Gift } from "lucide-react";
import { REF_COOKIE, REFERRAL, referrerByCode } from "@/lib/server/points";

/** "Your friend invited you" — shown on the tickets page after opening a friend's invite link. */
export async function InviteBanner({ km }: { km: boolean }) {
  const code = cookies().get(REF_COOKIE)?.value;
  const ref = code ? await referrerByCode(code) : null;
  if (!ref) return null;
  const who = ref.full_name?.trim() || (km ? "មិត្តរបស់អ្នក" : "Your friend");
  return (
    <div className="mb-6 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-accent/90 to-leaf p-4 text-forest shadow-soft sm:p-5">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70">
        <Gift size={24} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-extrabold leading-tight">{km ? `${who} បានអញ្ជើញអ្នកមកលេងសួនសត្វ!` : `${who} invited you to the zoo!`}</p>
        <p className="text-sm text-forest/80">
          {km
            ? `បង្កើតគណនីថ្មី ដើម្បីទទួលបាន ${REFERRAL.welcome} ពិន្ទុស្វាគមន៍ ហើយ ${who} ក៏ទទួលបានពិន្ទុដែរ។`
            : `Create an account to get ${REFERRAL.welcome} welcome points, and ${who} earns points too.`}
        </p>
      </div>
    </div>
  );
}
