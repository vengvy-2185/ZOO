"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Radio, Loader2 } from "lucide-react";
import { startLive } from "@/app/staff/(protected)/live/actions";

const PLACES = ["ទ្រុងដំរី · Elephants", "ទ្រុងខ្លា · Tigers", "ទ្រុងស្វា · Monkeys", "បឹងក្រពើ · Crocodiles", "ទ្រុងសត្វស្លាប · Birds", "ពេលចិញ្ចឹមសត្វ · Feeding time"];

function Go({ km }: { km: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 py-4 text-lg font-extrabold text-white shadow-lift transition active:scale-[.98] disabled:opacity-80">
      {pending ? <Loader2 size={22} className="animate-spin" /> : <span className="h-3 w-3 animate-pulse rounded-full bg-white" />}
      {km ? "ចាប់ផ្តើមផ្សាយផ្ទាល់" : "Go live now"}
    </button>
  );
}

export function GoLiveForm({ km }: { km: boolean }) {
  const router = useRouter();
  const [state, action] = useFormState(startLive, {});
  useEffect(() => {
    if (state.id) router.push(`/staff/live/${state.id}`);
  }, [state.id, router]);
  const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none focus:border-rose-500";
  return (
    <form action={action} className="card space-y-3 p-5">
      <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Radio size={20} className="text-red-600" /> {km ? "ផ្សាយផ្ទាល់ថ្មី" : "New live"}</p>
      <input name="title" required maxLength={120} placeholder={km ? "ចំណងជើង ឧ. ពេលចិញ្ចឹមដំរីពេលព្រឹក" : "Title, e.g. Morning elephant feeding"} className={field} />
      <input name="place" list="gwz-live-places" maxLength={80} placeholder={km ? "ទីកន្លែង (ជម្រើស)" : "Place (optional)"} className={field} />
      <datalist id="gwz-live-places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{state.error === "title" ? (km ? "សូមដាក់ចំណងជើង" : "Add a title") : state.error}</p>}
      <Go km={km} />
      <p className="text-xs text-ink/50">{km ? "គន្លឹះ៖ ប្រើ Wi-Fi ប្រសិនបើអាច កាន់ទូរស័ព្ទបញ្ឈរ ហើយកុំបិទអេក្រង់។ អ្នកដែលបើកការជូនដំណឹង នឹងទទួលសារថាអ្នកកំពុងផ្សាយ។" : "Tips: use Wi-Fi if you can, hold the phone upright, and keep the screen on. People with notifications on are told you're live."}</p>
    </form>
  );
}
