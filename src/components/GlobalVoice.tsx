"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { say, setVoice, voiceOn } from "@/lib/voice";
import { cn } from "@/lib/utils/cn";

// Everywhere on the website: messages that pop up on the screen are read
// aloud — pop-up notices (role="status" / "alert"), the green / red
// "saved" / "error" boxes of forms, and anything sent with the
// "gwz-say" event (new chat messages, calls, SOS).
const FEEDBACK = /(^|\s)bg-(emerald|green|red|rose|amber)-(50|100|500|600)(\s|$)|(^|\s)bg-light-green(\s|$)/;

function textOf(el: Element) {
  return (el as HTMLElement).innerText?.trim() ?? "";
}

export function GlobalVoice() {
  useEffect(() => {
    const onSay = (e: Event) => say(String((e as CustomEvent).detail ?? ""));
    window.addEventListener("gwz-say", onSay);
    const started = Date.now();
    const seen = new WeakSet<Element>();
    const consider = (el: Element) => {
      if (seen.has(el) || Date.now() - started < 1500) return; // not what was already on the page when it opened
      const role = el.getAttribute("role");
      const live = el.getAttribute("aria-live");
      const cls = typeof el.className === "string" ? el.className : "";
      const isMsg = role === "status" || role === "alert" || (live && live !== "off") || (/^(P|DIV|SPAN)$/.test(el.tagName) && FEEDBACK.test(cls));
      if (!isMsg) return;
      const t = textOf(el);
      if (!t || t.length > 300 || el.closest("[data-no-voice],textarea,input")) return;
      seen.add(el);
      say(t);
    };
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          consider(n);
          n.querySelectorAll?.("[role=status],[role=alert],[aria-live],p,div").forEach((x) => {
            const cls = typeof x.className === "string" ? x.className : "";
            if (x.getAttribute("role") || x.getAttribute("aria-live") || FEEDBACK.test(cls)) consider(x);
          });
        });
        // a live region whose words changed
        const host = m.target instanceof Element ? m.target.closest("[role=status],[role=alert],[aria-live]") : null;
        if (host && m.type === "characterData") {
          seen.delete(host);
          consider(host);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener("gwz-say", onSay);
      mo.disconnect();
    };
  }, []);
  return null;
}

/** The 🔊 button: read messages aloud, or not (kept on this device). */
export function VoiceToggle({ className, km }: { className?: string; km: boolean }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(voiceOn());
    const sync = () => setOn(voiceOn());
    window.addEventListener("gwz-voice", sync);
    return () => window.removeEventListener("gwz-voice", sync);
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        setVoice(!on);
        if (!on) setTimeout(() => say(km ? "បើកសំឡេងអានសារហើយ" : "Voice messages are on"), 50);
      }}
      aria-label={on ? (km ? "បិទសំឡេងអានសារ" : "Turn off voice") : km ? "បើកសំឡេងអានសារ" : "Turn on voice"}
      title={on ? (km ? "សំឡេងអានសារ៖ បើក" : "Voice: on") : km ? "សំឡេងអានសារ៖ បិទ" : "Voice: off"}
      className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition", className)}
    >
      {on ? <Volume2 size={18} /> : <VolumeX size={18} className="opacity-60" />}
    </button>
  );
}
