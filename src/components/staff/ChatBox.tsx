"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { SendHorizonal, Loader2 } from "lucide-react";
import { sendChat, type ChatState } from "@/app/staff/(protected)/actions";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-label="send" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white shadow-soft transition active:scale-90 disabled:opacity-60">
      {pending ? <Loader2 size={20} className="animate-spin" /> : <SendHorizonal size={20} />}
    </button>
  );
}

/** Keeps the chat scrolled to the newest message when new ones arrive. */
export function ChatScroll({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className="no-scrollbar h-[calc(100dvh-26rem)] min-h-[15rem] md:h-[min(60vh,560px)] space-y-2 overflow-y-auto scroll-smooth bg-[#F8FAFF] p-3 md:p-4">
      {children}
    </div>
  );
}

/** Type and send; Enter sends, Shift+Enter makes a new line. */
export function ChatComposer({ channel, km }: { channel: string; km: boolean }) {
  const [state, action] = useFormState<ChatState, FormData>(sendChat, {});
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      box.current?.focus();
    }
  }, [state]);
  return (
    <form ref={form} action={action} className="flex items-end gap-2 border-t border-black/5 bg-white p-3">
      <input type="hidden" name="channel" value={channel} />
      <textarea
        ref={box}
        name="body"
        data-live-ok
        required
        maxLength={1000}
        rows={1}
        placeholder={km ? "សរសេរសារ…" : "Write a message…"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (box.current?.value.trim()) form.current?.requestSubmit();
          }
        }}
        onInput={(e) => {
          const t = e.currentTarget;
          t.style.height = "auto";
          t.style.height = `${Math.min(140, t.scrollHeight)}px`;
        }}
        className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border border-black/10 bg-[#F8FAFF] px-4 py-3 text-sm text-ink outline-none focus:border-[#2563EB] focus:bg-white"
      />
      <SendButton />
    </form>
  );
}
