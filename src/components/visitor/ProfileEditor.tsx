"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, X, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { updateProfile } from "@/app/account/(dashboard)/actions";

/** Square-crops and shrinks a picked photo to 320×320 JPEG before upload. */
async function toAvatar(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const size = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = c.height = 320;
  c.getContext("2d")!.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 320, 320);
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), "image/jpeg", 0.88));
}

/** The avatar + name in the account header, with an edit sheet for both. */
export function ProfileEditor({ name, avatar, email }: { name: string; avatar: string | null; email: string | null }) {
  const { t } = useI18n();
  const p = t.profile;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [preview, setPreview] = useState<string | null>(avatar);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError(p.errors.image);
    try {
      const b = await toAvatar(f);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      setError(null);
    } catch {
      setError(p.errors.image);
    }
  }

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("name", value);
    if (blob) fd.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    start(async () => {
      const res = await updateProfile(fd);
      if (!res.ok) return setError(p.errors[res.error]);
      // New name/photo live in the login token: refresh it so the header updates too.
      await createClient().auth.refreshSession();
      setSaved(true);
      router.refresh();
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 1100);
    });
  }

  const initial = (value || email || "?").trim()[0]?.toUpperCase();

  return (
    <>
      <button onClick={() => setOpen(true)} className="group relative flex-shrink-0" aria-label={p.edit}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 font-display text-2xl font-bold ring-4 ring-white/20">{initial}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-leaf text-forest shadow-soft ring-2 ring-forest transition group-hover:scale-110">
          <Camera size={14} />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/70">{t.account.welcomeBack}</p>
        <button onClick={() => setOpen(true)} className="group flex max-w-full items-center gap-2 text-left">
          <h1 className="truncate font-display text-2xl font-extrabold md:text-3xl">{name}</h1>
          <Pencil size={16} className="flex-shrink-0 text-white/60 transition group-hover:text-leaf" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-[gwzFade_.2s_ease] sm:items-center" onClick={() => !pending && setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-[2rem] bg-white p-6 text-ink shadow-lift animate-[gwzDrop_.35s_ease] sm:rounded-[2rem]"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-forest">{p.title}</h2>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink/60" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center">
              <button onClick={() => fileRef.current?.click()} className="group relative">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" referrerPolicy="no-referrer" className="h-28 w-28 rounded-full object-cover ring-4 ring-light-green" />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-primary font-display text-4xl font-bold text-white">{initial}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                  <Camera size={26} />
                </span>
              </button>
              <button onClick={() => fileRef.current?.click()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                <Camera size={15} /> {p.changePhoto}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{p.nameLabel}</span>
              <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} className="input" autoComplete="name" />
              <span className="mt-1 block text-[11px] text-ink/45">{p.nameHint}</span>
            </label>
            {email && <p className="mt-3 text-xs text-ink/45">{p.email(email)}</p>}

            {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

            <button onClick={save} disabled={pending || saved || value.trim().length < 2} className="btn-primary mt-5 w-full py-3.5 text-base hover:translate-y-0 disabled:opacity-60">
              {saved ? <Check size={18} /> : pending ? <Loader2 size={18} className="animate-spin" /> : null}
              {saved ? p.saved : pending ? p.saving : p.save}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
