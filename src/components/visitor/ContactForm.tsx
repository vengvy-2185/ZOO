"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { sendContactMessage, type ContactState } from "@/app/contact/actions";
import { useI18n } from "@/lib/i18n/client";

const TEXT = {
  en: {
    name: "Your name",
    contact: "Phone or email",
    contactPh: "So we can reply to you",
    topic: "What is it about?",
    topics: { visit: "Planning a visit", tickets: "Tickets and payment", animals: "Our animals", lost: "Lost something", feedback: "Ideas and feedback", other: "Something else" },
    message: "Message",
    send: "Send message",
    sent: "Thank you! We got your message and will reply soon.",
    another: "Send another message",
    errors: { invalid: "Please fill in every box (the message needs at least 5 letters).", busy: "You have sent a few messages already. Please wait a little and try again.", error: "Something went wrong. Please try again." },
  },
  km: {
    name: "ឈ្មោះរបស់អ្នក",
    contact: "ទូរស័ព្ទ ឬអ៊ីមែល",
    contactPh: "ដើម្បីឲ្យយើងអាចឆ្លើយតបអ្នក",
    topic: "អំពីរឿងអ្វី?",
    topics: { visit: "រៀបចំការទស្សនា", tickets: "សំបុត្រ និងការបង់ប្រាក់", animals: "សត្វរបស់យើង", lost: "បាត់របស់", feedback: "គំនិត និងមតិ", other: "ផ្សេងៗ" },
    message: "សារ",
    send: "ផ្ញើសារ",
    sent: "អរគុណ! យើងបានទទួលសាររបស់អ្នក ហើយនឹងឆ្លើយតបឆាប់ៗ។",
    another: "ផ្ញើសារមួយទៀត",
    errors: { invalid: "សូមបំពេញគ្រប់ប្រអប់ (សារត្រូវមានយ៉ាងតិច 5 អក្សរ)។", busy: "អ្នកបានផ្ញើសារច្រើនហើយ។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្តងទៀត។", error: "មានបញ្ហាបន្តិច។ សូមព្យាយាមម្តងទៀត។" },
  },
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full justify-center py-3 text-base hover:translate-y-0 disabled:opacity-60">
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {label}
    </button>
  );
}

export function ContactForm() {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const [state, action] = useFormState<ContactState, FormData>(sendContactMessage, null);

  if (state?.ok) {
    return (
      <div className="card p-7 text-center">
        <CheckCircle2 size={52} className="mx-auto text-primary" />
        <p className="mt-3 font-display text-xl font-bold text-forest">{L.sent}</p>
        <a href="/contact" className="btn-outline mt-5">
          {L.another}
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-forest">
          {L.name}
          <input name="name" required maxLength={60} autoComplete="name" className="input mt-1.5" />
        </label>
        <label className="block text-sm font-bold text-forest">
          {L.contact}
          <input name="contact" required maxLength={80} placeholder={L.contactPh} autoComplete="tel" className="input mt-1.5" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-forest">{L.topic}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(L.topics) as (keyof typeof L.topics)[]).map((k, i) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-2xl bg-cream px-3 py-2.5 text-sm font-semibold text-forest ring-1 ring-transparent has-[:checked]:bg-light-green has-[:checked]:ring-primary">
              <input type="radio" name="topic" value={k} defaultChecked={i === 0} className="accent-[#2E8B57]" />
              {L.topics[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-bold text-forest">
        {L.message}
        <textarea name="message" required minLength={5} maxLength={1000} rows={5} className="input mt-1.5 rounded-3xl" />
      </label>
      {/* hidden from people, catches spam bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {state && !state.ok && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">{L.errors[state.error ?? "error"]}</p>}
      <Submit label={L.send} />
    </form>
  );
}
