"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Loader2, Save, Trash2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Submit button that shows a spinner while its server action runs. */
export function SubmitButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={cn("btn-primary px-6 py-3 hover:translate-y-0", className)}>
      {pending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Photo picker with instant preview. Sends the chosen file as `${name}_file`
 * and a pasted/existing URL as `${name}` — the server action uploads the
 * file to Supabase Storage when present, otherwise keeps the URL.
 */
export function ImageUploadField({
  name,
  label,
  hint,
  current,
  uploadLabel,
  urlLabel,
  aspect = "aspect-[4/3]",
  transparent = false,
}: {
  name: string;
  label: string;
  hint?: string;
  current?: string | null;
  uploadLabel: string;
  urlLabel: string;
  aspect?: string;
  /** Show the preview on a checkerboard (for transparent PNG cut-outs). */
  transparent?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [url, setUrl] = useState(current ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</span>
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "group relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/25 bg-light-green/60 transition hover:border-primary",
            aspect
          )}
          style={transparent && preview ? { background: "repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 0 0 / 16px 16px" } : undefined}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className={cn("h-full w-full", transparent ? "object-contain p-2" : "object-cover")} />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-primary">
              <ImagePlus size={28} />
              <span className="text-xs font-bold">{uploadLabel}</span>
            </span>
          )}
          {preview && (
            <span className="absolute inset-0 flex items-center justify-center bg-forest/50 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100">
              <ImagePlus size={20} className="mr-1.5" /> {uploadLabel}
            </span>
          )}
        </button>
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            name={`${name}_file`}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline w-full py-2 text-xs">
            <ImagePlus size={15} /> {uploadLabel}
          </button>
          <div className="relative">
            <input
              name={name}
              value={url}
              placeholder={urlLabel}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreview(e.target.value || null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 pr-9 text-xs outline-none focus:border-primary"
            />
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setPreview(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/40 hover:bg-black/5"
                aria-label="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {hint && <p className="text-[11px] text-ink/45">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/** Delete button that asks for a second tap before submitting its form. */
export function ConfirmDeleteButton({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  return (
    <button
      type={armed ? "submit" : "button"}
      disabled={pending}
      onClick={() => !armed && setArmed(true)}
      onBlur={() => setArmed(false)}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition",
        armed ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
      )}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      {armed ? confirmLabel : label}
    </button>
  );
}

/** Text box for a discount code, with a button that fills in a random, easy-to-read code. */
export function CodeField({ name, label, hint, defaultValue, generateLabel }: { name: string; label: string; hint?: string; defaultValue?: string; generateLabel: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const generate = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    setValue(`GWZ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`);
  };
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</span>
      <span className="flex gap-2">
        <input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
          maxLength={40}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button type="button" onClick={generate} className="btn-outline flex-shrink-0 px-4 py-2 text-xs">
          <Wand2 size={14} /> {generateLabel}
        </button>
      </span>
      {hint && <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>}
    </label>
  );
}
