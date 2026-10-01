"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, X, ArrowRight } from "lucide-react";
import { LottiePlayer } from "@/components/LottiePlayer";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

type Msg = {
  from: "me" | "bot";
  text: string;
  links?: { label: string; href: string }[];
  animal?: {
    code: string;
    name: string;
    species: string;
    image: string | null;
  };
};

/**
 * "Ask the Zoo" chat: instant answers from the zoo's own data (see
 * lib/server/assistant). Our robot waits in the corner (a small animation);
 * tap it to open the chat, tap anywhere outside (or Esc) to close. On a
 * computer the robot stands beside the chat, shows the animal it talks about,
 * and "thinks" while the answer is coming.
 */
export function ZooAssistant() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const a = t.assistant;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hint, setHint] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // A small "Ask me!" hint once per session, a few seconds after arriving.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gwz_assistant_hint")) return;
      const id = setTimeout(() => {
        setHint(true);
        sessionStorage.setItem("gwz_assistant_hint", "1");
        setTimeout(() => setHint(false), 6000);
      }, 7000);
      return () => clearTimeout(id);
    } catch {
      /* ignore */
    }
  }, []);

  // Following a link from the chat closes it.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, typing]);

  if (/^\/(admin|staff|auth)/.test(pathname)) return null;
  const lastBot = [...msgs].reverse().find((m) => m.from === "bot");
  const shown = lastBot?.animal?.image ? lastBot.animal : null;

  async function ask(q: string) {
    const text = q.trim();
    if (!text || typing) return;
    setMsgs((m) => [...m, { from: "me", text }]);
    setInput("");
    setTyping(true);
    const started = Date.now();
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, lang: locale === "km" ? "km" : "en" }),
      });
      const reply = await res.json();
      // a short, natural "typing" pause
      await new Promise((r) =>
        setTimeout(r, Math.max(0, 600 - (Date.now() - started))),
      );
      setMsgs((m) => [...m, { from: "bot", ...reply }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: a.offline }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <>
      {/* Launcher: a logo tab tucked against the right edge */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setHint(false);
          }}
          aria-label={a.open}
          className="group fixed bottom-24 right-1 z-40 h-[6.5rem] w-[5rem] transition-transform duration-300 hover:-translate-y-1 active:scale-95 md:bottom-5 md:right-4 md:h-[8.5rem] md:w-[6.5rem]"
        >
          <span className="absolute inset-x-3 bottom-1 h-3 rounded-[50%] bg-forest/25 blur-[4px] transition group-hover:scale-90" />
          <LottiePlayer src="/assistant/chatbot.json" className="relative h-full w-full drop-shadow-[0_8px_14px_rgba(14,63,36,.25)]" />
          <span className="absolute -top-1 right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-leaf ring-2 ring-white" />
          </span>
        </button>
      )}
      {hint && !open && (
        <button
          onClick={() => {
            setOpen(true);
            setHint(false);
          }}
          className="fixed bottom-[11rem] right-[4.5rem] z-40 max-w-[14rem] rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-left text-sm font-semibold text-forest shadow-lift ring-1 ring-black/5 animate-[gwzDrop_.4s_ease] md:bottom-[8.5rem] md:right-[7rem]"
        >
          {a.hint}
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {/* Tap anywhere outside to close */}
          <div
            className="fixed inset-0 z-40 bg-black/10 animate-[gwzFade_.2s_ease] md:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="pointer-events-none fixed bottom-6 right-[28rem] z-50 hidden w-[15rem] flex-col items-center md:flex" aria-hidden={!shown}>
            {shown && (
              <Link
                key={shown.code}
                href={`/animals/${shown.code}`}
                className="pointer-events-auto mb-3 w-full overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/5 animate-[gwzPop_.35s_ease] hover:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shown.image!} alt="" className="aspect-[4/3] max-h-[24vh] w-full object-cover" />
                <span className="block px-3.5 py-2.5">
                  <span className="block truncate font-display font-extrabold text-forest">{shown.name}</span>
                  <span className="flex items-center gap-1 truncate text-xs font-semibold text-primary">{shown.species} <ArrowRight size={12} /></span>
                </span>
              </Link>
            )}
            <div className="relative w-full">
              {typing && (
                <span className="absolute -top-2 left-1 z-10 flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-lift">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </span>
              )}
              {/* a little hop each time a new answer arrives */}
              <span key={msgs.length} className="block motion-safe:animate-[gwzRobotHop_.5s_ease]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assistant/robot.webp"
                alt=""
                className={cn("mx-auto h-auto max-h-[42vh] w-[13rem] object-contain drop-shadow-[0_18px_24px_rgba(14,63,36,.3)]", typing ? "motion-safe:animate-[gwzRobotThink_.7s_ease-in-out_infinite]" : "motion-safe:animate-[gwzRobotFloat_3.2s_ease-in-out_infinite]")}
              />
              </span>
              <span className="mx-auto -mt-2 block h-4 w-32 rounded-[50%] bg-forest/20 blur-[5px]" />
            </div>
          </div>
          <style>{`@keyframes gwzRobotFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes gwzRobotHop{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-18px) scale(1.03)}100%{transform:translateY(0) scale(1)}}@keyframes gwzRobotThink{0%,100%{transform:rotate(-2deg) translateY(0)}50%{transform:rotate(2deg) translateY(-4px)}}`}</style>
          <div
            className="fixed inset-x-2 bottom-24 top-20 z-50 flex flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/5 animate-[gwzSlideIn_.3s_ease] sm:inset-x-auto sm:right-4 sm:top-auto sm:h-[36rem] sm:max-h-[80vh] sm:w-[25rem] md:bottom-6 md:right-6"
            role="dialog"
            aria-label={a.title}
          >
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary to-forest px-3.5 py-2.5 text-white">
              <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-white/95 ring-2 ring-white/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assistant/robot-face.webp" alt="" className={cn("h-full w-full object-cover", typing && "motion-safe:animate-pulse")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[15px] font-bold leading-tight">
                  Green Wild Zoo
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf" />{" "}
                  {a.status}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={a.close}
              >
                <X size={16} />
              </button>
            </div>

            <div
              ref={listRef}
              className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-cream/50 p-3.5"
            >
              <Bubble from="bot" text={a.greeting} />
              {msgs.map((m, i) => (
                <div key={i} className="space-y-2">
                  <Bubble from={m.from} text={m.text} />
                  {m.animal && (
                    <Link
                      href={`/animals/${m.animal.code}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-black/5 hover:ring-primary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.animal.image ?? ""}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-forest">
                          {m.animal.name}
                        </p>
                        <p className="truncate text-xs text-ink/50">
                          {m.animal.species}
                        </p>
                      </div>
                    </Link>
                  )}
                  {m.links && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                        >
                          {l.label} <ArrowRight size={12} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div
                  className="flex w-fit gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-soft"
                  aria-label={a.typing}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {a.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-forest shadow-soft ring-1 ring-black/5 hover:ring-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick questions stay handy after the first answer */}
            {msgs.length > 0 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-black/5 px-3 pt-2.5">
                {a.suggestions.map((s) => (
                  <button key={s} onClick={() => ask(s)} disabled={typing} className="flex-shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-forest ring-1 ring-black/5 hover:ring-primary disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex items-center gap-2 border-t border-black/5 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={a.placeholder}
                maxLength={300}
                className="min-w-0 flex-1 rounded-full bg-cream px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                disabled={!input.trim() || typing}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                aria-label={a.send}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function Bubble({ from, text }: { from: "me" | "bot"; text: string }) {
  return (
    <div className={cn("flex", from === "me" && "justify-end")}>
      <p
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-soft animate-[gwzPop_.25s_ease]",
          from === "me"
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm bg-white text-ink/80",
        )}
      >
        {text}
      </p>
    </div>
  );
}
