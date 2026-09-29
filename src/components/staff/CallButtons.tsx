"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, Loader2 } from "lucide-react";
import { startCall } from "@/app/staff/(protected)/actions";

/** Voice / video call buttons at the top of a chat room (like Messenger). */
export function CallButtons({ channel, km }: { channel: string; km: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "voice" | "video">("");
  const call = async (video: boolean) => {
    setBusy(video ? "video" : "voice");
    const r = await startCall(channel, video).catch(() => ({ id: undefined, error: "x" }));
    if (r.id) router.push(`/staff/call/${r.id}?start=${video ? "video" : "voice"}`);
    else {
      setBusy("");
      alert(km ? "មិនអាចហៅបានទេ សូមសាកម្តងទៀត" : "Could not start the call");
    }
  };
  const btn = "flex h-10 w-10 items-center justify-center rounded-full text-[#1D4ED8] transition hover:bg-[#EEF2FF] active:scale-90 disabled:opacity-50";
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => call(false)} disabled={!!busy} className={btn} aria-label={km ? "ហៅជាសំឡេង" : "Voice call"} title={km ? "ហៅជាសំឡេង" : "Voice call"}>
        {busy === "voice" ? <Loader2 size={20} className="animate-spin" /> : <Phone size={20} />}
      </button>
      <button type="button" onClick={() => call(true)} disabled={!!busy} className={btn} aria-label={km ? "ហៅជាវីដេអូ" : "Video call"} title={km ? "ហៅជាវីដេអូ" : "Video call"}>
        {busy === "video" ? <Loader2 size={20} className="animate-spin" /> : <Video size={22} />}
      </button>
    </div>
  );
}
