import Link from "next/link";
import { Lock, LogIn, UserPlus } from "lucide-react";

const TEXT = {
  en: {
    title: "Sign in to continue",
    body: "Buying tickets and adopting animals need an account, so your tickets, points and receipts are saved safely and you can open them on any device.",
    signIn: "Sign in",
    signUp: "Create a free account",
    keep: "Your cart is kept. You'll come right back here after signing in.",
  },
  km: {
    title: "សូមចូលគណនីដើម្បីបន្ត",
    body: "ការទិញសំបុត្រ និងការឧបត្ថម្ភសត្វ ត្រូវការគណនី ដើម្បីរក្សាទុកសំបុត្រ ពិន្ទុ និងបង្កាន់ដៃរបស់អ្នកឲ្យមានសុវត្ថិភាព ហើយអាចបើកមើលបានគ្រប់ឧបករណ៍។",
    signIn: "ចូលគណនី",
    signUp: "បង្កើតគណនីឥតគិតថ្លៃ",
    keep: "កន្ត្រករបស់អ្នកនៅដដែល។ ក្រោយចូលគណនីរួច អ្នកនឹងត្រឡប់មកទីនេះវិញភ្លាម។",
  },
};

/** Shown instead of a purchase form to visitors who aren't signed in. */
export function SignInRequired({ next, km, showKeep = true }: { next: string; km: boolean; showKeep?: boolean }) {
  const L = TEXT[km ? "km" : "en"];
  const q = encodeURIComponent(next);
  return (
    <div className="card mx-auto mt-8 max-w-lg p-7 text-center md:p-9">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-light-green text-primary">
        <Lock size={30} />
      </span>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-forest">{L.title}</h2>
      <p className="mt-2 text-ink/65">{L.body}</p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link href={`/account/login?next=${q}`} className="btn-primary">
          <LogIn size={17} /> {L.signIn}
        </Link>
        <Link href={`/account/login?mode=signup&next=${q}`} className="btn-outline bg-white">
          <UserPlus size={17} /> {L.signUp}
        </Link>
      </div>
      {showKeep && <p className="mt-4 text-xs text-ink/45">{L.keep}</p>}
    </div>
  );
}
