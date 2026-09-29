import { Fragment } from "react";

// Web addresses, e-mails and phone numbers in a message become links you can tap.
const RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+|[\w.+-]+@[\w-]+\.[\w.-]+|(?:\+?855|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3,4})/gi;

export function Linkify({ text, className }: { text: string; className?: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    let raw = m[0];
    const at = m.index ?? 0;
    // a full stop / bracket after a link is not part of it
    const trail = raw.match(/[.,;:!?)\]}'"]+$/)?.[0] ?? "";
    if (trail) raw = raw.slice(0, -trail.length);
    if (at > last) out.push(text.slice(last, at));
    const href = /^https?:\/\//i.test(raw) ? raw : raw.includes("@") ? `mailto:${raw}` : /^www\./i.test(raw) ? `https://${raw}` : `tel:${raw.replace(/[\s-]/g, "")}`;
    const web = href.startsWith("http");
    out.push(
      <a key={at} href={href} target={web ? "_blank" : undefined} rel={web ? "noopener noreferrer" : undefined} className={className} onClick={(e) => e.stopPropagation()}>
        {raw}
      </a>
    );
    if (trail) out.push(trail);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</>;
}
